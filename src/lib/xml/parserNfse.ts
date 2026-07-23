/**
 * Parser tolerante de XML de NFS-e. Cada prefeitura brasileira usa um layout
 * diferente (tags, namespaces, encoding), então este parser busca por nome de
 * tag de forma flexível em vez de assumir um schema fixo. É deliberadamente
 * "melhor esforço": o usuário sempre confere os valores extraídos antes de
 * calcular o demonstrativo.
 */

export interface NotaFiscalDraft {
  tomador: string;
  prestador: string;
  numero: string;
  data: string;
  valorBruto: number;
  irRetPct: number;
  issRetPct: number;
  incluido: boolean;
  origem: "NOVO";
  cancelada: boolean;
}

/** Lê o cabeçalho `<?xml ... encoding="...">` para decodificar com a codificação
 * correta — muitas prefeituras usam ISO-8859-1/Windows-1252, não UTF-8, o que
 * corrompe acentos se decodificado direto como UTF-8. */
export function decodeXmlBuffer(buffer: ArrayBuffer): string {
  const head = new TextDecoder("utf-8").decode(buffer.slice(0, 200));
  const match = head.match(/encoding=["']([^"']+)["']/i);
  const encoding = match ? match[1].toLowerCase() : "utf-8";
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function deepFind(root: Element | Document, names: string[]): Element | null {
  const lowerNames = names.map((n) => n.toLowerCase());
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const localName = (el.localName || el.tagName).toLowerCase();
    if (lowerNames.includes(localName)) return el;
  }
  return null;
}

function findText(root: Element | Document, names: string[], scopeNames?: string[]): string {
  let scopeNode: Element | Document = root;
  if (scopeNames) {
    scopeNode = deepFind(root, scopeNames) || root;
  }
  const target = deepFind(scopeNode, names);
  return target ? (target.textContent || "").trim() : "";
}

/** Aceita tanto `1.234,56` (formato BR) quanto `1234.56` (formato simples). */
export function parseMoney(str: string | null | undefined): number {
  if (!str) return 0;
  const brFormat = parseFloat(str.replace(/\./g, "").replace(",", "."));
  if (!isNaN(brFormat) && str.includes(",")) return brFormat;
  const plain = parseFloat(str);
  return isNaN(plain) ? 0 : plain;
}

/**
 * Detecção conservadora de cancelamento: prefere deixar passar uma nota
 * duvidosa (para revisão manual) a esconder uma nota válida sem explicação.
 */
export function isCancelada(node: Element | Document): boolean {
  const situacao = findText(node, ["situacaonfse", "statusnfse"]);
  if (situacao) {
    const s = situacao.trim().toUpperCase();
    if (s === "C" || s === "CANCELADA" || s === "CANCELADO" || s === "CANCELLED") return true;
  }
  const codigoCancel = findText(node, ["codigocancelamento"]);
  if (codigoCancel && codigoCancel.trim() && codigoCancel.trim() !== "0") return true;
  const dataCancel = findText(node, ["datacancelamento"]);
  if (dataCancel && dataCancel.trim()) return true;
  return false;
}

/**
 * Um XML pode trazer várias notas num só arquivo (lote/retorno de prefeitura).
 * Procura contêineres típicos de uma nota individual; se não achar nenhum,
 * trata o arquivo inteiro como uma nota só.
 */
function getInvoiceNodes(doc: Document): Element[] {
  const candidatos = ["compnfse", "nfse"];
  for (const nome of candidatos) {
    const all = doc.getElementsByTagName("*");
    const encontrados: Element[] = [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const localName = (el.localName || el.tagName).toLowerCase();
      if (localName === nome) encontrados.push(el);
    }
    if (encontrados.length > 0) return encontrados;
  }
  return [doc.documentElement];
}

function extractInvoiceData(node: Element | Document): NotaFiscalDraft {
  const cancelada = isCancelada(node);
  const valorBrutoRaw = findText(node, ["valorservicos", "valorservico", "vlservicos"]);
  const numero = findText(node, ["numero"], ["infnfse"]) || findText(node, ["numero", "nnfse"]);
  const dataRaw = findText(node, ["dataemissao"]);
  const tomador =
    findText(node, ["razaosocial"], ["tomador"]) || findText(node, ["razaosocial", "nome"], ["tomadorservico"]);
  const prestador =
    findText(node, ["razaosocial"], ["prestador"]) || findText(node, ["razaosocial"], ["prestadorservico"]);

  let data = dataRaw;
  if (dataRaw && dataRaw.includes("-")) {
    const parts = dataRaw.substring(0, 10).split("-");
    if (parts.length === 3) data = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return {
    tomador: tomador || "",
    prestador: prestador || "",
    numero: numero || "",
    data: data || "",
    valorBruto: parseMoney(valorBrutoRaw),
    irRetPct: 1.5,
    issRetPct: 3,
    incluido: !cancelada,
    origem: "NOVO",
    cancelada,
  };
}

export function parseNfeXml(xmlText: string): NotaFiscalDraft[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("XML inválido");

  const invoiceNodes = getInvoiceNodes(doc);
  return invoiceNodes.map((node) => extractInvoiceData(node));
}

export interface ParseNfseFilesResult {
  notas: NotaFiscalDraft[];
  lidos: number;
  comErro: number;
  canceladas: number;
}

/** Ponto de entrada usado pelo componente de upload no navegador (lê File[] via FileReader). */
export async function parseNfseFiles(files: File[]): Promise<ParseNfseFilesResult> {
  const notas: NotaFiscalDraft[] = [];
  let lidos = 0;
  let comErro = 0;
  let canceladas = 0;

  const xmlFiles = files.filter((f) => f.name.toLowerCase().endsWith(".xml"));

  await Promise.all(
    xmlFiles.map(
      (file) =>
        new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const buffer = ev.target?.result as ArrayBuffer;
              const xmlText = decodeXmlBuffer(buffer);
              const parsed = parseNfeXml(xmlText);
              parsed.forEach((n) => {
                notas.push(n);
                lidos++;
                if (n.cancelada) canceladas++;
              });
            } catch {
              comErro++;
            }
            resolve();
          };
          reader.onerror = () => {
            comErro++;
            resolve();
          };
          reader.readAsArrayBuffer(file);
        })
    )
  );

  return { notas, lidos, comErro, canceladas };
}

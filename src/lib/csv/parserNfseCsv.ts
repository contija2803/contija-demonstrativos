/**
 * Parser do CSV de NFS-e exportado pela prefeitura (layout confirmado: Salvador/BA).
 * Diferente do XML, aqui a alíquota efetivamente retida em cada nota vem
 * diretamente das colunas de dados (não é um valor padrão chutado), então o
 * resultado reflete exatamente o que a prefeitura registrou.
 */

export interface NotaFiscalCsvDraft {
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
  descricao: string;
}

// Índices de coluna (base 0) do layout confirmado.
const COL = {
  NUMERO: 1,
  DATA_HORA: 2,
  PRESTADOR: 11,
  DATA_CANCELAMENTO: 23,
  VALOR_SERVICOS: 26,
  ALIQUOTA: 29,
  ISS_RETIDO: 32,
  IRPJ: 36,
  TOMADOR: 42,
  DISCRIMINACAO: 52,
} as const;

const MIN_COLUNAS = 53;

/** Detecta BOM UTF-8; caso contrário assume Windows-1252 (padrão dos exports de prefeitura). */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer);
  }
  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/** Aceita tanto `1.234,56` (formato BR) quanto `1234.56` (formato simples). */
export function parseMoney(str: string | null | undefined): number {
  if (!str) return 0;
  const brFormat = parseFloat(str.replace(/\./g, "").replace(",", "."));
  if (!isNaN(brFormat) && str.includes(",")) return brFormat;
  const plain = parseFloat(str);
  return isNaN(plain) ? 0 : plain;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function parseNfeCsv(csvText: string): NotaFiscalCsvDraft[] {
  const linhas = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return [];

  const notas: NotaFiscalCsvDraft[] = [];

  // Ignora o cabeçalho (linha 0) e a linha de total, se houver.
  for (let i = 1; i < linhas.length; i++) {
    const campos = linhas[i].split(";");
    if (campos.length < MIN_COLUNAS) continue;
    if (campos[0].trim().toLowerCase() === "total") continue;

    const valorBruto = parseMoney(campos[COL.VALOR_SERVICOS]);
    const dataCancelamento = campos[COL.DATA_CANCELAMENTO]?.trim() ?? "";
    const cancelada = dataCancelamento.length > 0;

    const retido = campos[COL.ISS_RETIDO]?.trim().toUpperCase() === "S";
    const aliquotaIss = parseMoney(campos[COL.ALIQUOTA]);
    const irpjValor = parseMoney(campos[COL.IRPJ]);

    const issRetPct = retido ? aliquotaIss : 0;
    const irRetPct = retido && valorBruto > 0 ? round2((irpjValor / valorBruto) * 100) : 0;

    const dataHora = campos[COL.DATA_HORA]?.trim() ?? "";
    const data = dataHora.split(" ")[0] ?? "";

    notas.push({
      tomador: campos[COL.TOMADOR]?.trim() ?? "",
      prestador: campos[COL.PRESTADOR]?.trim() ?? "",
      numero: campos[COL.NUMERO]?.trim() ?? "",
      data,
      valorBruto,
      irRetPct,
      issRetPct,
      incluido: !cancelada,
      origem: "NOVO",
      cancelada,
      descricao: campos[COL.DISCRIMINACAO]?.trim() ?? "",
    });
  }

  return notas;
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Tenta identificar a qual sócio uma nota pertence a partir do texto de
 * discriminação dos serviços (ex.: "... com Dr. Fulano de Tal CRM 12345").
 * Retorna o id do primeiro sócio cujo nome aparece no texto, ou null se
 * nenhum bater — nesse caso o usuário atribui manualmente na tabela.
 */
export function matchSocio(descricao: string, socios: { id: string; nome: string }[]): string | null {
  const desc = normalizar(descricao);
  if (!desc) return null;
  for (const s of socios) {
    const nome = normalizar(s.nome);
    if (nome && desc.includes(nome)) return s.id;
  }
  return null;
}

export interface ParseNfseCsvFilesResult {
  notas: NotaFiscalCsvDraft[];
  lidos: number;
  comErro: number;
  canceladas: number;
}

/** Ponto de entrada usado pelo componente de upload no navegador (lê File[] via FileReader). */
export async function parseNfseCsvFiles(files: File[]): Promise<ParseNfseCsvFilesResult> {
  const notas: NotaFiscalCsvDraft[] = [];
  let lidos = 0;
  let comErro = 0;
  let canceladas = 0;

  const csvFiles = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));

  await Promise.all(
    csvFiles.map(
      (file) =>
        new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const buffer = ev.target?.result as ArrayBuffer;
              const csvText = decodeCsvBuffer(buffer);
              const parsed = parseNfeCsv(csvText);
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

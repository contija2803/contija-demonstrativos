import { describe, it, expect } from "vitest";
import { decodeCsvBuffer, parseMoney, parseNfeCsv, matchSocio } from "./parserNfseCsv";

// Layout de 53 colunas confirmado num export real da prefeitura, mas todos os
// valores aqui são fictícios — nenhum dado real de paciente/cliente é usado.
function buildRow(overrides: Partial<Record<string, string>> = {}): string {
  const campos: Record<string, string> = {
    tipoRegistro: "2",
    numero: "100",
    dataHora: "15/03/2026 09:00:00",
    codigoVerificacao: "ABC12345",
    tipoRps: "RPS",
    serieRps: "",
    numeroRps: "",
    dataEmissaoRps: "",
    inscricaoMunicipalPrestador: "00.000.000/001-00",
    indicadorPrestador: "2",
    cpfCnpjPrestador: "00.000.000/0001-00",
    razaoSocialPrestador: "Clinica Ficticia LTDA",
    tipoEnderecoPrestador: "Rua",
    enderecoPrestador: "Rua Exemplo",
    numeroEnderecoPrestador: "100",
    complementoPrestador: "",
    bairroPrestador: "Centro",
    cidadePrestador: "Cidade Exemplo",
    ufPrestador: "BA",
    cepPrestador: "00000-000",
    emailPrestador: "",
    opcaoSimples: "0",
    situacao: "T",
    dataCancelamento: "",
    numeroGuia: "123456",
    dataQuitacao: "01/04/2026",
    valorServicos: "1000,00",
    valorDeducoes: "0,00",
    codigoServico: "401",
    aliquota: "3,00",
    issDevido: "30,00",
    valorCredito: "0,00",
    issRetido: "N",
    pis: "0,00",
    cofins: "0,00",
    inss: "0,00",
    irpj: "0,00",
    csll: "0,00",
    indicadorTomador: "1",
    cpfCnpjTomador: "000.000.000-00",
    inscricaoMunicipalTomador: "",
    inscricaoEstadualTomador: "",
    razaoSocialTomador: "Fulano de Tal Ficticio",
    tipoEnderecoTomador: "Rua",
    enderecoTomador: "Rua Teste",
    numeroEnderecoTomador: "1",
    complementoTomador: "",
    bairroTomador: "Bairro Teste",
    cidadeTomador: "Cidade Exemplo",
    ufTomador: "BA",
    cepTomador: "00000-000",
    emailTomador: "",
    discriminacao: "Servico de teste.",
    ...overrides,
  };

  return Object.values(campos).join(";");
}

const HEADER =
  "Tipo de Registro;Numero NFS-e;Data Hora NFE;Codigo;Tipo RPS;Serie;Numero RPS;Data Emissao RPS;Inscricao Municipal;Indicador;CPF/CNPJ Prestador;Razao Social Prestador;Tipo End;Endereco;Numero;Complemento;Bairro;Cidade;UF;CEP;Email;Opcao Simples;Situacao;Data Cancelamento;No Guia;Data Quitacao;Valor Servicos;Valor Deducoes;Codigo Servico;Aliquota;ISS devido;Valor Credito;ISS Retido;PIS;COFINS;INSS;IRPJ;CSLL;Indicador Tomador;CPF/CNPJ Tomador;Insc Mun Tomador;Insc Est Tomador;Razao Social Tomador;Tipo End Tomador;Endereco Tomador;Numero Tomador;Complemento Tomador;Bairro Tomador;Cidade Tomador;UF Tomador;CEP Tomador;Email Tomador;Discriminacao";

describe("parseMoney", () => {
  it("aceita formato BR (1.234,56)", () => {
    expect(parseMoney("1.234,56")).toBeCloseTo(1234.56, 2);
  });
  it("aceita formato simples (1234.56)", () => {
    expect(parseMoney("1234.56")).toBeCloseTo(1234.56, 2);
  });
  it("retorna 0 para vazio/indefinido", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney(undefined)).toBe(0);
    expect(parseMoney(null)).toBe(0);
  });
});

describe("decodeCsvBuffer", () => {
  it("decodifica UTF-8 quando há BOM", () => {
    const text = "Tipo;Nome\n2;José";
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(text)]);
    expect(decodeCsvBuffer(withBom.buffer)).toContain("José");
  });

  it("decodifica Windows-1252 por padrão (sem BOM)", () => {
    const header = new TextEncoder().encode("Tipo;Nome\n2;Jos");
    const buffer = new Uint8Array(header.length + 1);
    buffer.set(header, 0);
    buffer[header.length] = 0xe9; // 'é' em Windows-1252
    expect(decodeCsvBuffer(buffer.buffer)).toContain("José");
  });
});

describe("parseNfeCsv", () => {
  it("nota sem retenção (ISS Retido=N): issRetPct e irRetPct ficam zerados", () => {
    const csv = [HEADER, buildRow({ valorServicos: "1000,00", aliquota: "3,00", issRetido: "N", irpj: "0,00" })].join(
      "\n"
    );
    const [nota] = parseNfeCsv(csv);
    expect(nota.valorBruto).toBeCloseTo(1000, 2);
    expect(nota.issRetPct).toBe(0);
    expect(nota.irRetPct).toBe(0);
    expect(nota.cancelada).toBe(false);
    expect(nota.incluido).toBe(true);
  });

  it("nota com retenção (ISS Retido=S): deriva issRetPct da Alíquota e irRetPct da razão IRPJ/valor", () => {
    const csv = [
      HEADER,
      buildRow({
        valorServicos: "6000,00",
        aliquota: "3,00",
        issRetido: "S",
        irpj: "90,00", // 90 / 6000 = 1,5%
        pis: "39,00",
        cofins: "180,00",
        csll: "60,00",
      }),
    ].join("\n");
    const [nota] = parseNfeCsv(csv);
    expect(nota.issRetPct).toBeCloseTo(3, 2);
    expect(nota.irRetPct).toBeCloseTo(1.5, 2);
  });

  it("detecta nota cancelada pela Data de Cancelamento, mas mantém os dados para conferência", () => {
    const csv = [
      HEADER,
      buildRow({ situacao: "C", dataCancelamento: "20/03/2026", valorServicos: "800,00" }),
    ].join("\n");
    const [nota] = parseNfeCsv(csv);
    expect(nota.cancelada).toBe(true);
    expect(nota.incluido).toBe(false);
    expect(nota.valorBruto).toBeCloseTo(800, 2);
  });

  it("ignora a linha de cabeçalho e a linha de total", () => {
    const totalRow = buildRow({ tipoRegistro: "Total" });
    const csv = [HEADER, buildRow(), buildRow({ numero: "101" }), totalRow].join("\n");
    const notas = parseNfeCsv(csv);
    expect(notas).toHaveLength(2);
    expect(notas.map((n) => n.numero)).toEqual(["100", "101"]);
  });

  it("extrai número, data, tomador, prestador e descrição corretamente", () => {
    const csv = [
      HEADER,
      buildRow({ discriminacao: "Nota ref. a Consulta com Dr. Fulano de Tal CRM 12345." }),
    ].join("\n");
    const [nota] = parseNfeCsv(csv);
    expect(nota.numero).toBe("100");
    expect(nota.data).toBe("15/03/2026");
    expect(nota.tomador).toBe("Fulano de Tal Ficticio");
    expect(nota.prestador).toBe("Clinica Ficticia LTDA");
    expect(nota.descricao).toBe("Nota ref. a Consulta com Dr. Fulano de Tal CRM 12345.");
  });

  it("identifica tipoTomador PF quando o indicador é 1", () => {
    const csv = [HEADER, buildRow({ indicadorTomador: "1" })].join("\n");
    const [nota] = parseNfeCsv(csv);
    expect(nota.tipoTomador).toBe("PF");
  });

  it("identifica tipoTomador PJ quando o indicador é 2", () => {
    const csv = [HEADER, buildRow({ indicadorTomador: "2" })].join("\n");
    const [nota] = parseNfeCsv(csv);
    expect(nota.tipoTomador).toBe("PJ");
  });

  it("tipoTomador fica indefinido para indicador desconhecido", () => {
    const csv = [HEADER, buildRow({ indicadorTomador: "" })].join("\n");
    const [nota] = parseNfeCsv(csv);
    expect(nota.tipoTomador).toBeUndefined();
  });
});

describe("matchSocio", () => {
  const socios = [
    { id: "s1", nome: "Fulano de Tal" },
    { id: "s2", nome: "Beltrana da Silva" },
  ];

  it("encontra o sócio cujo nome aparece na descrição", () => {
    expect(matchSocio("Nota ref. a Consulta com Dr. Fulano de Tal CRM 12345.", socios)).toBe("s1");
    expect(matchSocio("Consulta realizada pela Dra. Beltrana da Silva.", socios)).toBe("s2");
  });

  it("ignora acentuação e caixa ao comparar", () => {
    expect(matchSocio("consulta com dr. FULANO DE TAL crm 1", socios)).toBe("s1");
  });

  it("retorna null quando nenhum sócio bate", () => {
    expect(matchSocio("Consulta com Dr. Ninguem Registrado", socios)).toBeNull();
  });

  it("retorna null para descrição vazia", () => {
    expect(matchSocio("", socios)).toBeNull();
  });
});

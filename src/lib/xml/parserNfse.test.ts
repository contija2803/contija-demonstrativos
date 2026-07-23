// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { decodeXmlBuffer, parseMoney, parseNfeXml } from "./parserNfse";

function toBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

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

describe("decodeXmlBuffer", () => {
  it("decodifica UTF-8 quando o encoding declarado é utf-8", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><a>José da Silva</a>`;
    expect(decodeXmlBuffer(toBuffer(xml))).toContain("José da Silva");
  });

  it("decodifica Windows-1252 quando o encoding declarado exige (muitas prefeituras usam)", () => {
    const header = `<?xml version="1.0" encoding="Windows-1252"?><a>Servi`;
    const footer = `o</a>`; // "Serviço" com o 'ç' cru em Windows-1252 (0xE7)
    const headerBytes = new TextEncoder().encode(header);
    const footerBytes = new TextEncoder().encode(footer);
    const buffer = new Uint8Array(headerBytes.length + 1 + footerBytes.length);
    buffer.set(headerBytes, 0);
    buffer[headerBytes.length] = 0xe7; // 'ç' em Windows-1252
    buffer.set(footerBytes, headerBytes.length + 1);

    const decoded = decodeXmlBuffer(buffer.buffer);
    expect(decoded).toContain("Serviço");
  });
});

describe("parseNfeXml", () => {
  it("extrai dados de um layout ABRASF-like (CompNfse > Nfse > InfNfse)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
        <Nfse>
          <InfNfse>
            <Numero>202400001</Numero>
            <DataEmissao>2024-03-15T10:00:00</DataEmissao>
            <DeclaracaoPrestacaoServico>
              <InfDeclaracaoPrestacaoServico>
                <Servico><Valores><ValorServicos>1500.00</ValorServicos></Valores></Servico>
                <Tomador><RazaoSocial>Clinica Exemplo LTDA</RazaoSocial></Tomador>
                <Prestador><RazaoSocial>Dr Fulano de Tal</RazaoSocial></Prestador>
              </InfDeclaracaoPrestacaoServico>
            </DeclaracaoPrestacaoServico>
          </InfNfse>
        </Nfse>
      </CompNfse>`;

    const [nota] = parseNfeXml(xml);
    expect(nota.numero).toBe("202400001");
    expect(nota.data).toBe("15/03/2024");
    expect(nota.valorBruto).toBeCloseTo(1500, 2);
    expect(nota.tomador).toBe("Clinica Exemplo LTDA");
    expect(nota.prestador).toBe("Dr Fulano de Tal");
    expect(nota.cancelada).toBe(false);
    expect(nota.incluido).toBe(true);
    expect(nota.irRetPct).toBe(1.5);
    expect(nota.issRetPct).toBe(3);
  });

  it("extrai dados de um layout de outra prefeitura, com nomes de tag diferentes", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <nfse>
        <nNfse>987654</nNfse>
        <DataEmissao>2024-05-02</DataEmissao>
        <VlServicos>2340,50</VlServicos>
        <TomadorServico><Nome>Joao da Silva ME</Nome></TomadorServico>
      </nfse>`;

    const [nota] = parseNfeXml(xml);
    expect(nota.numero).toBe("987654");
    expect(nota.data).toBe("02/05/2024");
    expect(nota.valorBruto).toBeCloseTo(2340.5, 2);
    expect(nota.tomador).toBe("Joao da Silva ME");
  });

  it("processa várias notas presentes no mesmo arquivo (lote)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <ConsultarNfseResposta>
        <Nfse><InfNfse>
          <Numero>1</Numero><DataEmissao>2024-01-10</DataEmissao><ValorServicos>100.00</ValorServicos>
          <Tomador><RazaoSocial>Empresa Um</RazaoSocial></Tomador>
        </InfNfse></Nfse>
        <Nfse><InfNfse>
          <Numero>2</Numero><DataEmissao>2024-01-11</DataEmissao><ValorServicos>200.00</ValorServicos>
          <Tomador><RazaoSocial>Empresa Dois</RazaoSocial></Tomador>
        </InfNfse></Nfse>
      </ConsultarNfseResposta>`;

    const notas = parseNfeXml(xml);
    expect(notas).toHaveLength(2);
    expect(notas[0].numero).toBe("1");
    expect(notas[0].valorBruto).toBeCloseTo(100, 2);
    expect(notas[1].numero).toBe("2");
    expect(notas[1].valorBruto).toBeCloseTo(200, 2);
  });

  it("detecta nota cancelada via SituacaoNfse='C' e não a esconde, só desmarca", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <CompNfse><Nfse><InfNfse>
        <Numero>555</Numero><DataEmissao>2024-02-20</DataEmissao><ValorServicos>300.00</ValorServicos>
        <SituacaoNfse>C</SituacaoNfse>
        <Tomador><RazaoSocial>Empresa Cancelada</RazaoSocial></Tomador>
      </InfNfse></Nfse></CompNfse>`;

    const [nota] = parseNfeXml(xml);
    expect(nota.cancelada).toBe(true);
    expect(nota.incluido).toBe(false);
    // mesmo cancelada, os dados continuam extraídos para conferência manual
    expect(nota.valorBruto).toBeCloseTo(300, 2);
  });

  it("detecta nota cancelada via CodigoCancelamento diferente de zero", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <CompNfse><Nfse><InfNfse>
        <Numero>556</Numero><ValorServicos>50.00</ValorServicos>
        <CodigoCancelamento>7</CodigoCancelamento>
      </InfNfse></Nfse></CompNfse>`;

    const [nota] = parseNfeXml(xml);
    expect(nota.cancelada).toBe(true);
  });

  it("lança erro para XML malformado", () => {
    expect(() => parseNfeXml("<a><b></a>")).toThrow();
  });
});

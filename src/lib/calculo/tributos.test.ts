import { describe, it, expect } from "vitest";
import { calcularDemonstrativo, calcularDemonstrativosPorSocio } from "./tributos";

describe("calcularDemonstrativo", () => {
  it("Lucro Presumido — uma nota, sem custos fixos", () => {
    const resultado = calcularDemonstrativo(
      { regime: "PRESUMIDO" },
      [{ id: "nf1", tomador: "Cliente A", numero: "1", valorBruto: 1000, irRetPct: 1.5 }],
      []
    );

    const [linha] = resultado.linhas;
    expect(linha.issRet).toBeCloseTo(30, 2);
    expect(linha.pis).toBeCloseTo(6.5, 2);
    expect(linha.cofins).toBeCloseTo(30, 2);
    expect(linha.csllRet).toBeCloseTo(10, 2);
    expect(linha.irRet).toBeCloseTo(15, 2);
    expect(linha.totalRetencoes).toBeCloseTo(91.5, 2);
    expect(linha.provIrpj).toBeCloseTo(33, 2);
    expect(linha.provCsll).toBeCloseTo(18.8, 2);
    expect(linha.totalProvisoes).toBeCloseTo(51.8, 2);
    expect(linha.valorLiquido).toBeCloseTo(856.7, 2);
    expect(linha.valorLiquidoNf).toBeCloseTo(908.5, 2);

    expect(resultado.valorATransferir).toBeCloseTo(856.7, 2);
    expect(resultado.valorLiquidoNfGeral).toBeCloseTo(908.5, 2);
  });

  it("Simples Nacional — uma nota, sem custos fixos", () => {
    const resultado = calcularDemonstrativo(
      { regime: "SIMPLES", aliquotaSimplesMensal: 11.2 },
      [{ id: "nf1", tomador: "Cliente B", numero: "1", valorBruto: 2000, issRetPct: 3 }],
      []
    );

    const [linha] = resultado.linhas;
    expect(linha.issRet).toBeCloseTo(60, 2);
    expect(linha.totalRetencoes).toBeCloseTo(60, 2);
    expect(linha.provDas).toBeCloseTo(164, 2);
    expect(linha.totalProvisoes).toBeCloseTo(164, 2);
    expect(linha.valorLiquido).toBeCloseTo(1776, 2);
    expect(linha.valorLiquidoNf).toBeCloseTo(1940, 2);

    expect(resultado.valorATransferir).toBeCloseTo(1776, 2);
  });

  it("Lucro Presumido — lote com 2 notas, custo fixo aplicado só na primeira", () => {
    const resultado = calcularDemonstrativo(
      { regime: "PRESUMIDO" },
      [
        { id: "nf1", tomador: "Cliente A", numero: "1", valorBruto: 1000, irRetPct: 1.5 },
        { id: "nf2", tomador: "Cliente A", numero: "2", valorBruto: 2000, irRetPct: 2 },
      ],
      [{ id: "cf1", desc: "Honorário contábil", valor: 500 }]
    );

    expect(resultado.totalCustoFixo).toBeCloseTo(500, 2);

    const [linha1, linha2] = resultado.linhas;
    expect(linha1.custoFixoAplicado).toBeCloseTo(500, 2);
    expect(linha2.custoFixoAplicado).toBeCloseTo(0, 2);

    // NF1 sofre o desconto do custo fixo; NF2 não.
    expect(linha1.valorLiquido).toBeCloseTo(356.7, 2);
    expect(linha2.valorLiquido).toBeCloseTo(1713.4, 2);

    // valorLiquidoNf nunca é afetado pelo custo fixo.
    expect(linha1.valorLiquidoNf).toBeCloseTo(908.5, 2);
    expect(linha2.valorLiquidoNf).toBeCloseTo(1807, 2);

    expect(resultado.totalValorBruto).toBeCloseTo(3000, 2);
    expect(resultado.totalRetencoesGeral).toBeCloseTo(284.5, 2);
    expect(resultado.totalProvisoesGeral).toBeCloseTo(145.4, 2);
    expect(resultado.valorLiquidoNfGeral).toBeCloseTo(2715.5, 2);
    expect(resultado.valorATransferir).toBeCloseTo(2070.1, 2);
  });

  it("provisão nunca é negativa quando a retenção na nota já supera a alíquota-alvo", () => {
    const presumido = calcularDemonstrativo(
      { regime: "PRESUMIDO" },
      [{ id: "nf1", tomador: "X", numero: "1", valorBruto: 1000, irRetPct: 10 }],
      []
    );
    expect(presumido.linhas[0].provIrpj).toBe(0);

    const simples = calcularDemonstrativo(
      { regime: "SIMPLES", aliquotaSimplesMensal: 5 },
      [{ id: "nf1", tomador: "Y", numero: "1", valorBruto: 1000, issRetPct: 10 }],
      []
    );
    expect(simples.linhas[0].provDas).toBe(0);
  });
});

describe("calcularDemonstrativosPorSocio", () => {
  it("divide cada custo fixo igualmente entre todos os sócios ativos, mesmo os sem nota este mês", () => {
    const grupos = [
      {
        socioId: "s1",
        socioNome: "Dr. A",
        notas: [{ id: "nf1", tomador: "X", numero: "1", valorBruto: 1000, irRetPct: 1.5 }],
      },
      {
        socioId: "s2",
        socioNome: "Dr. B",
        notas: [{ id: "nf2", tomador: "Y", numero: "2", valorBruto: 2000, irRetPct: 1.5 }],
      },
    ];
    // 3 sócios ativos no total (um deles sem nota incluída este mês)
    const resultados = calcularDemonstrativosPorSocio(
      { regime: "PRESUMIDO" },
      grupos,
      [{ id: "cf1", desc: "Honorário contábil", valor: 900 }],
      3
    );

    expect(resultados).toHaveLength(2);
    // 900 / 3 sócios = 300 para cada um
    expect(resultados[0].custosUsados[0].valor).toBeCloseTo(300, 2);
    expect(resultados[1].custosUsados[0].valor).toBeCloseTo(300, 2);
    expect(resultados[0].resultado.totalCustoFixo).toBeCloseTo(300, 2);
    expect(resultados[0].resultado.linhas[0].custoFixoAplicado).toBeCloseTo(300, 2);
    expect(resultados[1].resultado.linhas[0].custoFixoAplicado).toBeCloseTo(300, 2);
  });

  it("não gera demonstrativo para sócio sem nenhuma nota incluída", () => {
    const grupos = [
      { socioId: "s1", socioNome: "Dr. A", notas: [{ id: "nf1", tomador: "X", numero: "1", valorBruto: 1000, irRetPct: 1.5 }] },
      { socioId: "s2", socioNome: "Dr. B", notas: [] },
    ];
    const resultados = calcularDemonstrativosPorSocio({ regime: "PRESUMIDO" }, grupos, [], 2);
    expect(resultados).toHaveLength(1);
    expect(resultados[0].socioId).toBe("s1");
  });

  it("com um único sócio, o resultado é idêntico a calcularDemonstrativo direto (divisor 1)", () => {
    const notas = [{ id: "nf1", tomador: "X", numero: "1", valorBruto: 1000, irRetPct: 1.5 }];
    const custos = [{ id: "cf1", desc: "Honorário", valor: 500 }];
    const direto = calcularDemonstrativo({ regime: "PRESUMIDO" }, notas, custos);
    const [porSocio] = calcularDemonstrativosPorSocio(
      { regime: "PRESUMIDO" },
      [{ socioId: "s1", socioNome: "Dr. A", notas }],
      custos,
      1
    );
    expect(porSocio.resultado.valorATransferir).toBeCloseTo(direto.valorATransferir, 2);
  });
});

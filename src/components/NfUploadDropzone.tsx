"use client";

import { useRef, useState } from "react";
import { parseNfseCsvFiles } from "@/lib/csv/parserNfseCsv";
import type { NotaFiscalJSON } from "@/lib/serialize";

interface Props {
  clienteId: string;
  onAdded: (notas: NotaFiscalJSON[]) => void;
}

export function NfUploadDropzone({ clienteId, onAdded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (!files.length) return;

    setBusy(true);
    try {
      const { notas, lidos, comErro, canceladas } = await parseNfseCsvFiles(files);

      let addedCount = 0;
      if (notas.length) {
        const res = await fetch(`/api/clientes/${clienteId}/notas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notas }),
        });
        if (res.ok) {
          const created: NotaFiscalJSON[] = await res.json();
          addedCount = created.length;
          onAdded(created);
        }
      }

      setNote({
        text: `${lidos} NF(s) lida(s)${canceladas ? ", " + canceladas + " cancelada(s) — vieram desmarcadas na tabela, confira antes de incluir" : ""}${comErro ? ", " + comErro + " arquivo(s) com erro (adicione manualmente)" : ""}. Confira os valores extraídos na tabela abaixo antes de calcular.`,
        warn: comErro > 0 || addedCount === 0,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        className={`drop${dragging ? " drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div>
          <b>{busy ? "Processando…" : "Arraste o arquivo CSV de NFs aqui"}</b> ou clique para selecionar
        </div>
        <div className="hint">Aceita um ou vários CSVs de NFS-e ao mesmo tempo</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {note && <div className={`note${note.warn ? " warn" : ""}`}>{note.text}</div>}
    </div>
  );
}

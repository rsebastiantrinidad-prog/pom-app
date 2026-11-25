import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { crc32, csvCell, toCsv, zipFiles } from "./backup";

describe("CSV (PER-111)", () => {
  it("escapa comas, comillas y saltos de línea", () => {
    expect(csvCell('dijo "hola", y\nse fue')).toBe('"dijo ""hola"", y\nse fue"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(4)).toBe("4");
    expect(csvCell("Me llamaron")).toBe("Me llamaron");
  });

  it("arma el archivo con BOM, encabezados y CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('﻿a,b\r\n1,"x,y"\r\n');
  });
});

describe("ZIP (PER-111)", () => {
  it("calcula el CRC-32 estándar", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("genera un .zip que se puede abrir y conserva el contenido", () => {
    const text = toCsv(["nota"], [["Acentos: ñ, á — “comillas”"]]);
    const zip = zipFiles([
      { name: "pom_sessions.csv", data: new TextEncoder().encode(text) },
      { name: "vacío.csv", data: new Uint8Array() },
    ]);
    const dir = mkdtempSync(join(tmpdir(), "pom-zip-"));
    const file = join(dir, "backup.zip");
    writeFileSync(file, zip);
    // Lo abre Python (zipfile valida los CRC al leer).
    const out = execFileSync("python", [
      "-c",
      "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); sys.stdout.buffer.write((str(z.testzip())+'\\n').encode()+z.read('pom_sessions.csv'))",
      file,
    ]);
    const [first, ...rest] = out.toString("utf8").split("\n");
    expect(first.trim()).toBe("None");
    expect(rest.join("\n")).toBe(text);
    expect(readFileSync(file).subarray(0, 2).toString()).toBe("PK");
  });
});

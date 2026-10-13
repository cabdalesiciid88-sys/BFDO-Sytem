import "server-only";
import { mkdir, readFile as fsReadFile, rm, writeFile as fsWriteFile } from "node:fs/promises";
import path from "node:path";
import { absolutePathFor } from "@/lib/storage/paths";

export async function writeStorageFile(relativeStoragePath: string, data: Buffer): Promise<void> {
  const absolutePath = absolutePathFor(relativeStoragePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await fsWriteFile(absolutePath, data);
}

export async function readStorageFile(relativeStoragePath: string): Promise<Buffer> {
  return fsReadFile(absolutePathFor(relativeStoragePath));
}

export async function deleteStorageFile(relativeStoragePath: string): Promise<void> {
  await rm(absolutePathFor(relativeStoragePath), { force: true });
}

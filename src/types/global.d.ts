export {}

declare global {
  interface Window {
    api?: {
      hashSha256(text: string): Promise<string>
    }
  }
}

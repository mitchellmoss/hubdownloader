declare module 'pornhub.js' {
  export interface VideoInfo {
    title?: string
    downloadURLs?: Record<string, string>
    mediaDefinitions?: Array<{
      videoUrl?: string
      quality?: string
      format?: string
    }>
  }

  export class PornHub {
    constructor()
    video(id: string): Promise<VideoInfo>
  }
}
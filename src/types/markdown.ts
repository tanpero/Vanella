export type MdNode = {
  type: string
  children?: MdNode[]
  value?: string
  url?: string
  title?: string | null
  alt?: string | null
  lang?: string
  depth?: number
  ordered?: boolean
  start?: number
  checked?: boolean
  align?: Array<'left'|'center'|'right' | null>
}

export type MdRoot = { type: 'root'; children?: MdNode[] }


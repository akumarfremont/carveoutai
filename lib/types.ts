export type Firm = "EY" | "KPMG" | "PwC" | "Deloitte";

export interface RawChunk {
  id: string;
  firm: Firm | string;
  title: string;
  year: string;
  page: number;
  chunk_index: number;
  source_file: string;
  category: string;
  text: string;
}

export interface EmbeddedChunk extends RawChunk {
  embedding: number[];
}

export interface Citation {
  index: number;
  firm: string;
  title: string;
  page: number;
  excerpt: string;
}

export type PersonaId = "sec_reviewer" | "external_auditor" | "preparer";

export interface DebateTurn {
  persona: PersonaId;
  role: "opening" | "rebuttal" | "synthesis";
  content: string;
}

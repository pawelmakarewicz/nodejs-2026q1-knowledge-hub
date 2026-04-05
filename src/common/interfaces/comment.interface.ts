export interface IComment {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: number;
}

/**
 * Button component props type
 */
export interface Button {
  label: string;
  href: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
}

/**
 * Content type for page content
 */
export type ContentType =
  | { type: "text"; value: string }
  | { type: "button"; value: Button }
  | { type: "list"; value: string[] }
  | { type: "table"; value: Record<string, string | number | boolean>[] }
  | { type: "image"; value: string; alt?: string };

/**
 * Page content props for different pages in the application
 */
export interface PageContentProps {
  title: string;
  description: string;
  content: ContentType[];
}

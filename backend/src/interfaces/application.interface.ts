export type Application = {
  app_name: string;
  favicon: string;
  app_description: string;
  content: string;
  logo: string;
  logo_light: string;
  logo_dark: string;
  logo_sm_dark: string;
  logo_sm_light: string;
};

export type ViewResponse = {
  layout: string;
  t_title_id: string;
  t_page_title_id: string;
  message?: string;
  error?: string;
};

export interface ParserAttributes {
  versionCode: number;
  versionName: string;
  package: string;
}

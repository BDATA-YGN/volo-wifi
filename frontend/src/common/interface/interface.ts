export interface CommonListResponse {
    message?: string;
    data: any[];
    meta?: Meta;
  }
  
  export interface CommonResponse {
    message?: string;
    data: any;
    meta?: any;
  }
  
  export interface PaginationParams {
    take?: number;
    skip?: number;
    page?: number;
    limit?: number;
    search?: any;
    sort_by?: string; // Add sort_by to the interface
    order_by?: 'asc' | 'desc'; // Add order_by to specify the sort direction
    total?: number
    searchText?: string;
    filterStatus?: number | undefined;
    status?: any;
    languageId?: number;
    artistId?: number;
    albumId?: number;
    genreId?: number;
    artistName?: string;
    albumName?: string;
    genreName?: string;
    sortBy?: string;
    sortOrder?: string;
    category?: string | null;
    folder?: string | null;
    parentId?: string | null;
    /** Comma-separated MngRoleSettingKind values to exclude from list (e.g. menuGroup,menu) */
    excludeKinds?: string;
    /** Exact kind filter */
    kind?: string;
  }
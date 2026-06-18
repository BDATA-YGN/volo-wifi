// for api response meta for list types
type Meta = {
    currentPage: number
    totalPages: number
    totalRows: number
}

// for api request param
type Params = {
    page?: number
    limit?: number
    search?: string
    filter?: any
    sortBy?: string
    order?: string
}

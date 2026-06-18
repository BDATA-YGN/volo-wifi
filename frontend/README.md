This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
yarn dev


# build
chmod +x build-standalone.sh
./build-standalone.sh
```

{/* Genre Selection with Create New Option */}
        <Form.Item name="genreId" label="Genre" rules={[{ required: true, message: "Please select a genre" }]}>
          <Select
            showSearch
            allowClear
            value={selectedGenre}
            onChange={handleSelectChange}
            filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}
            placeholder="Select a genre"
            className="w-full"
            popupRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                <div style={{ padding: "8px", cursor: "pointer" }} onMouseDown={(e) => e.preventDefault()} onClick={() => setUiState((prev) => ({ ...prev, showCreateGenreModal: true }))} className="flex items-center text-blue-600 hover:bg-blue-50">
                  <PlusOutlined className="mr-2" />
                  Create New Genre
                </div>
              </>
            )}
          >
            {genresList.map((genre) => (
              <Select.Option key={genre.id} value={genre.name}>
                {genre.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

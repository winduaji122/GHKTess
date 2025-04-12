# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## API Documentation

This section provides documentation for the backend API endpoints used by this React application. These endpoints are implemented in the backend server and are used to manage posts, labels, and user authentication.

## Posts

### Get All Posts

Retrieves a list of posts with optional filtering and pagination.

- **URL**: `/api/posts`
- **Method**: `GET`
- **URL Params**:
  - `status` (optional): Filter posts by status. Possible values: 'published', 'draft', 'archived', 'all'
  - `page` (optional): Page number for pagination. Default is 1.
  - `limit` (optional): Number of posts per page. Default is 10.

**Example Request**:

GET /api/posts?status=published&page=1&limit=10

**Success Response**:
- **Code**: 200
- **Content**:
```json
{
  "posts": [
    {
      "id": "1",
      "title": "Sample Post",
      "content": "This is a sample post content",
      "status": "published",
      "image": "path/to/image.jpg",
      "publish_date": "2023-05-20T10:00:00Z",
      "is_featured": false,
      "is_spotlight": true,
      "author_id": "author1",
      "excerpt": "This is a sample excerpt",
      "slug": "sample-post",
      "labels": [
        {"id": "1", "label": "Technology"},
        {"id": "2", "label": "News"}
      ]
    }
  ],
  "currentPage": 1,
  "totalPages": 5,
  "totalCount": 50
}
```


### Create Post

Creates a new post.

- **URL**: `/api/posts`
- **Method**: `POST`
- **Headers**: 
  - Content-Type: multipart/form-data
- **Body**:
  - `title` (required): String
  - `content` (required): String
  - `publish_date` (optional): Date
  - `is_featured` (optional): Boolean
  - `is_spotlight` (optional): Boolean
  - `labels` (optional): Array of label IDs
  - `excerpt` (optional): String
  - `slug` (optional): String
  - `status` (optional): String ('published', 'draft', 'archived')
  - `image` (optional): File

**Success Response**:
- **Code**: 201
- **Content**:
```json
{
  "message": "Post created successfully",
  "post": {
    "id": "2",
    "title": "New Post",
    "content": "This is a new post content",
    "status": "published"
  }
}

### Update Post

Updates an existing post.

- **URL**: `/api/posts/:id`
- **Method**: `PUT`
- **URL Params**:
  - `id`: ID of the post to update
- **Headers**: 
  - Content-Type: multipart/form-data
- **Body**: Same as Create Post, all fields are optional

**Success Response**:
- **Code**: 200
- **Content**:
json
{
"message": "Post updated successfully",
"post": {
"id": "2",
"title": "Updated Post",
"content": "This is an updated post content",
"status": "published",
}
}


### Delete Post

Deletes a post.

- **URL**: `/api/posts/:id`
- **Method**: `DELETE`
- **URL Params**:
  - `id`: ID of the post to delete

**Success Response**:
- **Code**: 200
- **Content**:
json
{
"message": "Post deleted successfully"
}


### Toggle Featured Post

Toggles the featured status of a post.

- **URL**: `/api/posts/:id/toggle-featured`
- **Method**: `PUT`
- **URL Params**:
  - `id`: ID of the post

**Success Response**:
- **Code**: 200
- **Content**:
json
{
"message": "Post featured status updated successfully",
"post": {
"id": "2",
"title": "Sample Post",
"is_featured": true,
...
}
}


### Toggle Spotlight Post

Toggles the spotlight status of a post.

- **URL**: `/api/posts/:id/toggle-spotlight`
- **Method**: `PUT`
- **URL Params**:
  - `id`: ID of the post
- **Body**:
  - `is_spotlight`: Boolean

**Success Response**:
- **Code**: 200
- **Content**:
json
{
"message": "Post ditambahkan ke spotlight",
"post": {
"id": "2",
"title": "Sample Post",
"is_spotlight": true,
...
}
}


### Generate Slug

Generates a slug from a given title.

- **URL**: `/api/posts/generate-slug`
- **Method**: `POST`
- **Body**:
  - `title`: String

**Success Response**:
- **Code**: 200
- **Content**:
json
{
"slug": "sample-post-title"
}


## Labels

### Add Label to Post

Adds a label to a post.

- **URL**: `/api/posts/:postId/labels`
- **Method**: `POST`
- **URL Params**:
  - `postId`: ID of the post
- **Body**:
  - `label_ids`: Array of label IDs

**Success Response**:
- **Code**: 200
- **Content**:
json
{
"message": "Label berhasil ditambahkan ke post",
"labels": [
{"id": "1", "label": "Technology"},
{"id": "2", "label": "News"}
]
}


### Remove Label from Post

Removes a label from a post.

- **URL**: `/api/posts/:postId/labels/:labelId`
- **Method**: `DELETE`
- **URL Params**:
  - `postId`: ID of the post
  - `labelId`: ID of the label to remove

**Success Response**:
- **Code**: 200
- **Content**:

json
{
"message": "Label berhasil dihapus dari post",
"labels": [
{"id": "2", "label": "News"}
]
}


## Authentication

Note: Authentication endpoints are not explicitly shown in the provided code, but they are typically required for a blog application. Here's a general structure:

### Login

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  - `email`: String
  - `password`: String

### Register

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Body**:
  - `name`: String
  - `email`: String
  - `password`: String

### Logout

- **URL**: `/api/auth/logout`
- **Method**: `POST`

Note: Actual implementation details may vary based on your authentication system.

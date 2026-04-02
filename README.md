# LinkedIn MCP Server

MCP server for publishing posts, articles, and media to LinkedIn. Part of the [Human Agency Protocol](https://humanagencyprotocol.org).

## Tools

| Tool | Description |
|---|---|
| `create_post` | Publish a text post |
| `create_article_post` | Publish a post with a link/article |
| `create_image_post` | Publish a post with an image |
| `get_post` | Get a post by URN |
| `list_posts` | List your recent posts |
| `delete_post` | Delete a post |
| `get_profile` | Get your LinkedIn profile |

## Setup

1. Create a LinkedIn App at [linkedin.com/developers](https://www.linkedin.com/developers/)
2. Add "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" products
3. Set `LINKEDIN_ACCESS_TOKEN` environment variable

## Usage

```bash
npx @humanagencyp/linkedin-mcp
```

Or with the HAP Gateway — add your LinkedIn credentials in the Integrations page.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LINKEDIN_ACCESS_TOKEN` | Yes | OAuth2 access token |

## Token Refresh

LinkedIn access tokens expire after 60 days. Programmatic refresh tokens are only available to approved Marketing Developer Platform partners. For personal use, re-authenticate via the HAP Gateway when the token expires.

## Disclaimer

This software is not affiliated with, endorsed by, or officially connected to LinkedIn or Microsoft. Use of the LinkedIn API is subject to LinkedIn's [API Terms of Use](https://www.linkedin.com/legal/l/api-terms-of-use). You are responsible for complying with LinkedIn's terms and rate limits.

## License

MIT — see [LICENSE](LICENSE). Provided as-is, without warranty or support.

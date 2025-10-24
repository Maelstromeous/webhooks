# GitHub Webhook Example

This document provides an example of how GitHub webhooks interact with this service.

## GitHub Webhook Configuration

To configure a GitHub webhook:

1. Go to your repository settings
2. Navigate to **Webhooks** → **Add webhook**
3. Configure the webhook:
   - **Payload URL**: `https://your-server.com/digletbot`
   - **Content type**: `application/json`
   - **Secret**: Your `WEBHOOK_SECRET` value
   - **Events**: Choose events that should trigger deployment (e.g., "push", "release")

## Example Webhook Payload

When a GitHub event occurs (e.g., a push to the repository), GitHub will send a POST request to your webhook endpoint with a payload similar to this:

### Push Event Example

```json
{
  "ref": "refs/heads/main",
  "before": "0000000000000000000000000000000000000000",
  "after": "1234567890abcdef1234567890abcdef12345678",
  "repository": {
    "id": 123456789,
    "name": "your-repo",
    "full_name": "username/your-repo",
    "private": false,
    "owner": {
      "name": "username",
      "email": "user@example.com"
    },
    "html_url": "https://github.com/username/your-repo",
    "description": "Repository description",
    "fork": false,
    "created_at": 1234567890,
    "updated_at": 1234567890,
    "pushed_at": 1234567890,
    "default_branch": "main"
  },
  "pusher": {
    "name": "username",
    "email": "user@example.com"
  },
  "sender": {
    "login": "username",
    "id": 12345678,
    "type": "User"
  },
  "created": false,
  "deleted": false,
  "forced": false,
  "commits": [
    {
      "id": "1234567890abcdef1234567890abcdef12345678",
      "message": "Update application",
      "timestamp": "2025-10-24T12:00:00Z",
      "url": "https://github.com/username/your-repo/commit/1234567890abcdef1234567890abcdef12345678",
      "author": {
        "name": "Author Name",
        "email": "author@example.com",
        "username": "username"
      },
      "committer": {
        "name": "Committer Name",
        "email": "committer@example.com",
        "username": "username"
      },
      "added": [],
      "removed": [],
      "modified": [
        "src/index.ts"
      ]
    }
  ],
  "head_commit": {
    "id": "1234567890abcdef1234567890abcdef12345678",
    "message": "Update application",
    "timestamp": "2025-10-24T12:00:00Z",
    "author": {
      "name": "Author Name",
      "email": "author@example.com",
      "username": "username"
    }
  }
}
```

### Release Event Example

```json
{
  "action": "published",
  "release": {
    "url": "https://api.github.com/repos/username/your-repo/releases/123456",
    "html_url": "https://github.com/username/your-repo/releases/tag/v1.0.0",
    "id": 123456,
    "tag_name": "v1.0.0",
    "target_commitish": "main",
    "name": "Release v1.0.0",
    "draft": false,
    "prerelease": false,
    "created_at": "2025-10-24T12:00:00Z",
    "published_at": "2025-10-24T12:05:00Z",
    "author": {
      "login": "username",
      "id": 12345678,
      "type": "User"
    },
    "body": "Release notes for v1.0.0"
  },
  "repository": {
    "id": 123456789,
    "name": "your-repo",
    "full_name": "username/your-repo",
    "owner": {
      "login": "username",
      "id": 12345678,
      "type": "User"
    }
  },
  "sender": {
    "login": "username",
    "id": 12345678,
    "type": "User"
  }
}
```

## Request Headers

GitHub includes several headers with webhook requests:

```
POST /digletbot HTTP/1.1
Host: your-server.com
User-Agent: GitHub-Hookshot/abc123
Content-Type: application/json
Content-Length: 1234
X-GitHub-Delivery: 12345678-1234-1234-1234-123456789012
X-GitHub-Event: push
X-GitHub-Hook-ID: 123456789
X-GitHub-Hook-Installation-Target-ID: 123456789
X-GitHub-Hook-Installation-Target-Type: repository
X-Hub-Signature: sha1=<signature>
X-Hub-Signature-256: sha256=<hmac-sha256-signature>
```

**Important**: This webhook service verifies the `X-Hub-Signature-256` header, which contains the HMAC SHA256 signature of the request body.

## Signature Verification

GitHub calculates the signature as follows:

1. Take the raw request body (JSON string)
2. Calculate HMAC SHA256 using your webhook secret
3. Prepend "sha256=" to the hex digest
4. Send in the `X-Hub-Signature-256` header

Example in bash:

```bash
# Given a payload and secret
PAYLOAD='{"ref":"refs/heads/main","repository":{"name":"your-repo"}}'
SECRET="your-webhook-secret"

# Calculate signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"

# Send webhook
curl -X POST https://your-server.com/digletbot \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Testing with the Test Script

You can use the included `test-webhook.sh` script to simulate GitHub webhooks:

```bash
# Test with a simple payload
./test-webhook.sh '{"ref":"refs/heads/main","repository":{"name":"digletbot"}}'

# Test with a specific event
WEBHOOK_URL=https://your-server.com/digletbot \
WEBHOOK_SECRET=your-secret \
./test-webhook.sh '{"action":"published","release":{"tag_name":"v1.0.0"}}'
```

## Expected Response

On successful deployment, the service responds with:

```json
{
  "success": true,
  "message": "Deployment triggered successfully",
  "output": "Successfully pulled images and restarted digletbot"
}
```

On authentication failure:

```json
{
  "error": "Invalid signature"
}
```

On rate limit exceeded:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

## Webhook Event Types

Common GitHub events you might want to trigger deployments:

- **push**: Code is pushed to a repository
- **release**: A release is published
- **create**: A branch or tag is created
- **workflow_run**: A GitHub Actions workflow completes
- **deployment**: A deployment is created via the Deployments API

You can configure which events trigger the webhook in your repository's webhook settings.

## Security Notes

1. **Always verify the signature**: This prevents unauthorized deployment triggers
2. **Use HTTPS**: Protect your webhook secret in transit
3. **Rate limiting**: The service limits requests to 10 per minute per IP
4. **IP whitelisting**: Consider restricting webhook access to GitHub's IP ranges
5. **Logging**: All webhook requests are logged for audit purposes

## GitHub IP Addresses

For additional security, you can whitelist GitHub's webhook IP addresses:

- Check the current list at: https://api.github.com/meta
- Look for the "hooks" array in the response

Example firewall rule (update IPs from the API):

```bash
# Allow GitHub webhook IPs
sudo iptables -A INPUT -p tcp --dport 3000 -s 192.30.252.0/22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -s 185.199.108.0/22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -s 140.82.112.0/20 -j ACCEPT
# Add more IPs as needed
```

## Troubleshooting

### Webhook delivery fails

1. Check your server is accessible from the internet
2. Verify the webhook URL is correct
3. Check firewall rules allow incoming traffic
4. Review webhook delivery logs in GitHub repository settings

### Signature verification fails

1. Verify the `WEBHOOK_SECRET` matches in both GitHub and your server
2. Check the signature is being sent in `X-Hub-Signature-256` header
3. Ensure the payload hasn't been modified in transit
4. Review server logs for signature comparison details

### Rate limiting issues

1. Check if multiple webhooks are configured for the same event
2. Verify you're not receiving unexpected webhook deliveries
3. Consider increasing the rate limit in `src/rateLimit.ts` if needed
4. Review IP-based rate limiting to ensure it's not too restrictive

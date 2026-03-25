# Form Embedding Guide

This guide explains how to embed your Next.js form into any website using a floating button that opens the form in a modal.

## Files Created/Modified

1. **`public/embed.js`** - The embeddable JavaScript script that injects the floating button and modal.
2. **`src/app/forms/[id]/fill/page.tsx`** - Modified to detect iframe embedding and notify parent window on form submission.
3. **`test-embed.html`** - A test HTML file to demonstrate the embedding.

## How to Use

### 1. Host the Script

The `embed.js` file is located in the `public` directory. When you deploy your Next.js app, it will be accessible at `https://yourdomain.com/embed.js`.

### 2. Configure the Embed

On any website where you want to embed the form, add the following code before the closing `</body>` tag:

```html
<!-- Configure the embed script -->
<script>
    window.FormEmbedConfig = {
        formId: 'your-form-id-here', // Required: Replace with actual form ID
        buttonText: 'Contact Us',    // Optional: Text on the button
        buttonColor: '#007bff',      // Optional: Button background color
        buttonPosition: 'bottom-right', // Optional: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
        buttonSize: 'medium',        // Optional: 'small', 'medium', 'large'
        modalWidth: '90%',           // Optional: Modal width (e.g., '90%', '600px')
        modalHeight: '80%',          // Optional: Modal height (e.g., '80%', '500px')
        domain: 'https://yourdomain.com' // Optional: Your app's domain (defaults to current origin)
    };
</script>

<!-- Include the embed script -->
<script src="https://yourdomain.com/embed.js"></script>
```

### 3. Configuration Options

- **`formId`** (required): The ID of the form you want to embed. You can find this in your forms list or URL.
- **`buttonText`**: The text displayed on the floating button.
- **`buttonColor`**: Hex color code for the button background.
- **`buttonPosition`**: Position of the button on the screen.
- **`buttonSize`**: Size of the button.
- **`modalWidth`** & **`modalHeight`**: Dimensions of the modal containing the form.
- **`domain`**: The base URL of your Next.js app.

### 4. Testing

1. Start your Next.js development server: `npm run dev`
2. Open `test-embed.html` in a browser (or serve it via a local server).
3. Replace `'your-form-id-here'` with an actual form ID from your app.
4. Click the floating button to open the form in a modal.
5. Submit the form to test the functionality.

### 5. Production Deployment

- Ensure your Next.js app is deployed and accessible.
- Update the `domain` in the config to your production URL.
- The script will load the form from `https://yourdomain.com/forms/{formId}/fill` in an iframe.

## How It Works

1. The script injects a floating button into the host website.
2. When clicked, it creates a modal overlay with an iframe loading your form.
3. The form detects it's in an iframe and behaves accordingly (e.g., no navigation after submission).
4. On successful form submission, the modal closes automatically.

## Security Considerations

- The iframe loads your form from your domain, so CORS policies apply.
- Form submissions go through your existing API endpoints.
- No sensitive data is exposed in the embed script.

## Customization

You can further customize the appearance by modifying the CSS in `embed.js` or extending the configuration options.

## Troubleshooting

- **Button not showing**: Check console for errors; ensure `formId` is provided.
- **Form not loading**: Verify the `domain` URL and that your app is running.
- **Modal issues**: Check modal dimensions and ensure no conflicting CSS on the host site.

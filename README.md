# Rich Text Editor

This is an experimental WYSIWYG editor. The goal is to achieve an immersive and concise editing environment.

Features:

- Shortcut key `/` to call out the block format menu.
- Inline format menu displayed on demand.
- Markdown-style formatted shortcut input.
- Code highlighting.

This project is developed based on ProseMirror and CodeMirror.

**It has not been developed yet, and it is not recommended to use it in a production environment.**

## Installation

```
npm install @chloerei/rich-text-editor
```

or

```
yarn add @chloerei/rich-text-editor
```

## Usage

```html
<div id="editor"></div>
```

```javascript
import { Editor } from "@chloerei/rich-text-editor"
import "@chloerei/rich-text-editor/dist/style.css"

new Editor(document.querySelector('#editor'))
```

## Feedback

Open issues in https://github.com/chloerei/rich-text-editor/issues

## License

MIT license.

import { NodeSelection } from "prosemirror-state"
import { schema } from './schema'

export class FigureView {
  constructor(node, view, getPos, options) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.dom = document.createElement('figure')
    this.dom.className = 'editor-figure'
    this.options = options

    this.dom.innerHTML = `<div class="editor-figure__container" contenteditable="false">
        <div class="editor-figure__uploader">
          <label class="editor-figure__uploader__button">
            <div class="editor-figure__uploader__icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>
            </div>
            <div class="editor-figure__uploader__label">
              Click to select a image
            </div>
            <input type="file">
          </label>
        </div>
        <div class="editor-figure__content">
        </div>
        <div class="editor-figure__progress">
          <div class="editor-progress">
            <div class="editor-progress__bar">
            </div>
          </div>
        </div>
      </div>
      <figcaption></figcaption>`

    this.dom.querySelector('.editor-figure__uploader input').addEventListener('change', (event) => {
      this.startUpload(event.target.files[0])
    })

    this.dom.querySelector('.editor-figure__container').addEventListener('click', (event) => {
      this.view.dispatch(
        this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, this.getPos()))
      )
    })

    this.contentDOM = this.dom.querySelector('figcaption')
    this.progressBarTarget = this.dom.querySelector('.editor-progress__bar')

    this.renderContent(node)
  }

  selectNode() {
    this.dom.classList.add("editor-selected")
    this.dom.draggable = true

    if (this.node.attrs.image) {
      this.dom.querySelector('.editor-popup-menu').classList.add('editor-popup-menu--open')
    }
  }

  deselectNode() {
    this.dom.classList.remove("editor-selected")
    this.dom.draggable = false

    if (this.node.attrs.image) {
      this.dom.querySelector('.editor-popup-menu').classList.remove('editor-popup-menu--open')
    }
  }

  ignoreMutation(mutation) {
    return !this.contentDOM.contains(mutation.target)
  }

  renderContent(node) {
    let image = this.dom.querySelector('.editor-figure__content img')
    if (this.isImageChanged(node)) {
      let content = this.dom.querySelector('.editor-figure__content')
      content.innerHTML = ''
      if (node.attrs.image) {
        let image = document.createElement('img')
        for (var key in node.attrs.image) {
          image.setAttribute(key, node.attrs.image[key])
        }
        content.appendChild(image)
      }
    }

    this.dom.classList.toggle('editor-figure--empty', node.attrs.image == null)

    this.dom.classList.toggle('editor-breakout-wide', node.attrs.breakout == 'wide')
    this.dom.classList.toggle('editor-breakout-full', node.attrs.breakout == 'full')

    if (node.content.size > 0) {
      this.contentDOM.removeAttribute('data-placeholder')
    } else {
      this.contentDOM.setAttribute('data-placeholder', 'Caption (optional)')
    }
  }

  isImageChanged(node) {
    let image = this.dom.querySelector('.editor-figure__content img')

    if ((node.attrs.image && !image) || (!node.attrs.image && image)) {
      return true
    }

    if (node.attrs.image) {
      for (var key in node.attrs.image) {
        if (node.attrs.image[key] != image.getAttribute(key)) {
          return true
        }
      }
    }

    return false
  }

  startUpload(file) {
    let image = document.createElement('img')
    let reader = new FileReader()
    reader.addEventListener('load', () => {
      image.src = reader.result
    })
    reader.readAsDataURL(file)

    this.dom.querySelector('.editor-figure__content').innerHTML = ''
    this.dom.querySelector('.editor-figure__content').appendChild(image)

    if (this.options.uploadFile) {
      this.setProgress(0)
      this.dom.classList.add('editor-figure--uploading')

      this.options.uploadFile({
        file: file,
        setProgress: this.setProgress.bind(this),
        setAttributes: this.setAttributes.bind(this)
      })
    }
  }

  update(node) {
    if (node.type.name != 'figure') {
      return false
    }

    this.node = node

    this.renderContent(node)

    return true
  }

  setProgress(percent) {
    this.progressBarTarget.style.width = percent + '%'
  }

  setAttributes(attributes) {
    this.dom.classList.remove('editor-figure--uploading')
    this.view.dispatch(this.view.state.tr.setNodeMarkup(this.getPos(), null, {
      image: {
        src: attributes.url
      }
    }))
  }
}

import { Decoration, EditorView, MatchDecorator, ViewPlugin, WidgetType } from "@codemirror/view"

const placeholderMatcher = new MatchDecorator({
  regexp: /^```*(\w+)$/g,
  decoration: match => Decoration.replace({
    widget: new PlaceholderWidget(match[1]),
  }),
})

const placeholders = ViewPlugin.fromClass(class {
  placeholders: any

  constructor(view: EditorView) {
        this.placeholders = placeholderMatcher.createDeco(view)
  }

    update(update: any) {
    this.placeholders = placeholderMatcher.updateDeco(update, this.placeholders)
  }
}, {
    decorations: instance => instance.placeholders,
    provide: plugin => EditorView.atomicRanges.of(view => {
        return (
      view.plugin(plugin)?.placeholders || Decoration.none
    )
  }),
})

class PlaceholderWidget extends WidgetType {
  name: string

  constructor(name: string) {
    super()
    this.name = name
  }

  eq(other: PlaceholderWidget) {
    return this.name == other.name
  }

  toDOM() {
    let elt = document.createElement("span")
    elt.style.cssText = `
      border: 1px solid orange;
      border-radius: 4px;
      padding: 0 3px;
      background: lightyellow;
      font-weight: bold;
      color: black;
      `
    elt.textContent = this.name
    return elt
  }

  ignoreEvent() {
    return false
  }
}

export default placeholders

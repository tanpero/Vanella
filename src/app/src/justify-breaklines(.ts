import enUsPatterns from 'hyphenation.en-us';
import { createHyphenator, justifyContent } from 'tex-linebreak';

const hyphenate = createHyphenator(enUsPatterns)

export default () => {
    const paragraphs = Array.from(document.querySelectorAll('p, li'))
    justifyContent(paragraphs, hyphenate)
}

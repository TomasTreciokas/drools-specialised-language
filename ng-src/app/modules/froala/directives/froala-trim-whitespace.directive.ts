import { Directive, Host, Optional } from '@angular/core';
import { FroalaDirective } from './froala.directive';

export function assertNotNull<T>(
  val: T,
  msg?: string
): asserts val is NonNullable<T> {
  if (val == undefined || val == null)
    throw new Error(msg ?? 'Null Assertion Failed!');
}

/**
 * Trim leading and trailing whitespace. Remove extra elements
 */
@Directive({
  selector: '[froalaTrimWhitespace]',
})
export class FroalaTrimWhitespaceDirective {
  constructor(@Host() @Optional() froalaDir: FroalaDirective) {
    assertNotNull(froalaDir);

    froalaDir.registerOutputTransformer((str) => {
      const el = document.createElement('p');
      el.innerHTML = str;
      if (el.firstChild && el.firstChild.nodeName == 'P') {
        this.trimWhitespaceHTML(el, 'firstChild');
        this.trimWhitespaceHTML(el, 'lastChild');
        this.removeDuplicateChildren(el);
        return el.innerHTML;
      }
      return str;
    });
  }

  private trimWhitespaceHTML(
    el: Node,
    dir: 'firstChild' | 'lastChild'
  ): boolean {
    let child = el[dir];
    while (child) {
      if (!this.trimWhitespaceHTML(child, dir)) {
        break;
      }
      child = el[dir];
    }

    if (el.nodeType == Node.TEXT_NODE && el.textContent) {
      if (dir == 'firstChild') {
        el.textContent = el.textContent.trimStart();
      } else {
        el.textContent = el.textContent.trimEnd();
      }
      if (el.textContent.length == 0 && el.parentNode) {
        el.parentNode.removeChild(el);
        return true;
      }
    }

    if (
      el.nodeType == Node.ELEMENT_NODE &&
      el.childNodes.length == 0 &&
      el.parentNode &&
      (el as Element).attributes.length == 0
    ) {
      el.parentNode.removeChild(el);
      return true;
    }

    return false;
  }

  private removeDuplicateChildren(el: Node) {
    el.childNodes.forEach((n) => {
      this.removeDuplicateChildren(n);
    });

    if (
      el.nodeType == Node.ELEMENT_NODE &&
      el.childNodes.length == 1 &&
      el.firstChild &&
      el.nodeName === el.firstChild.nodeName &&
      (el as Element).attributes.length == 0 &&
      (el.firstChild as Element).attributes.length == 0
    ) {
      const ch = el.firstChild;
      el.removeChild(ch);
      while (ch.firstChild) {
        const n = ch.firstChild;
        ch.removeChild(n);
        el.appendChild(n);
      }
    }
  }
}

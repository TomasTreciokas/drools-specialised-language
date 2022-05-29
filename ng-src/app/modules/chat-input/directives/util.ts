export function growSelectionToWord(selection: Selection) {
	const text = selection.focusNode?.textContent;
	if (!text) {
		return null;
	}
	const currentIndex = selection.focusOffset;
	let startIndex = currentIndex - 1;
	while (startIndex >= 0 && !/\s/.test(text[startIndex])) startIndex--;
	startIndex++;
	let endIndex = currentIndex - 1;
	while (endIndex < text.length && !/\s/.test(text[endIndex])) endIndex++;
	return [startIndex, endIndex] as const;
}

export function cmpRng(a: Range | null | undefined, b: Range | null | undefined) {
	if ((a == null || a == undefined) && (b == null || b == undefined)) {
		return true;
	}
	const ret =
		!!a &&
		!!b &&
		a.startContainer === b.startContainer &&
		a.startOffset === b.startOffset &&
		a.endContainer === b.endContainer &&
		a.endOffset === b.endOffset;
	return ret;
}

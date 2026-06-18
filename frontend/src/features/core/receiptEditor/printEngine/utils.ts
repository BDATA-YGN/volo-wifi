function cleanReceiptHtml(html: string): string {
    // Parse HTML string to DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Select all elements with data-rfd-draggable-context-id
    const elements = doc.querySelectorAll('[data-rfd-draggable-context-id]');
    
    elements.forEach(element => {
        // Remove data-rfd-draggable-context-id and related attributes
        element.removeAttribute('data-rfd-draggable-context-id');
        element.removeAttribute('data-rfd-draggable-id');
        element.removeAttribute('tabindex');
        element.removeAttribute('role');
        element.removeAttribute('aria-describedby');
        element.removeAttribute('data-rfd-drag-handle-draggable-id');
        element.removeAttribute('data-rfd-drag-handle-context-id');
        element.removeAttribute('draggable');

        // Remove element-actions div
        const actionsDiv = element.querySelector('.element-actions');
        if (actionsDiv) {
            actionsDiv.remove();
        }
    });

    // Remove drop-zone class from receipt-content
    const dropZone = doc.querySelector('.drop-zone');
    if (dropZone) {
        dropZone.classList.remove('drop-zone');
    }

    // Serialize back to HTML string
    return doc.body.innerHTML;
}

export { cleanReceiptHtml };
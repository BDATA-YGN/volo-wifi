const handleKeyDownForAcceptNumbers = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  // Allow control keys like backspace, delete, arrows, tab
  if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
    return;
  }

  // Block if not a digit
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
};

const handlePasteForOnlyNumber = (e: any) => {
  if (!/^\d+$/.test(e.clipboardData.getData("Text"))) {
    e.preventDefault();
  }
};

const handleKeyDownForNumberPxPercent = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  // Allowed control keys
  if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
    return;
  }

  // Allow digits
  if (/^\d$/.test(e.key)) {
    return;
  }

  // Allow px, %, and space
  if (["p", "x", "%", " "].includes(e.key.toLowerCase())) {
    return;
  }

  // Otherwise block input
  e.preventDefault();
};

const handlePasteForNumberPxPercent = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const pasted = e.clipboardData.getData("text");

  // Only allow patterns like: "10px", "20%", "10px 20px", "5% 10% 15% 20px"
  if (!/^(\d+(px|%)?)(\s+\d+(px|%)?)*$/.test(pasted)) {
    e.preventDefault();
  }
};

export { handleKeyDownForAcceptNumbers, handlePasteForOnlyNumber, handleKeyDownForNumberPxPercent, handlePasteForNumberPxPercent };

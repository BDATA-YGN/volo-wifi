const imageUtils = {
    generate: (filePath: string, size?: "s" | "m" | "l" | "xl" | undefined) => {
      const route =
        filePath.startsWith("/") || filePath.startsWith("\\")
          ? filePath
          : `/${filePath}`;
      if (size) {
        switch (size) {
          case "s":
            return `/_next/image?url=${route}&w=64&q=75`;
          case "m":
            return `/_next/image?url=${route}&w=128&q=75`;
          case "l":
            return `/_next/image?url=${route}&w=256&q=75`;
          case "xl":
            return `/_next/image?url=${route}&w=512&q=75`;
          default:
            return `${process.env.BASE_URL}${route}`;
        }
      } else {
        return `${process.env.BASE_URL}${route}`;
      }
    },
  };


// <img
//     className="w-full h-screen object-cover"
//     src={imageUtils.generate(slide.backgroundImage, "xl")}
//     title={"hero background"}
//     alt={"hero background"}
// />

  export default imageUtils;

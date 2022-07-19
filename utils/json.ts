import fs from "fs";

export function loadJsonFile(file: string) {
    const appRoot = require("app-root-path");
    try {
        const data = fs.readFileSync(`${appRoot}${file[0] === "/" ? file : "/" + file}`);
        return JSON.parse(data as any);
    } catch (err) {
        return {};
    }   
};

export function writeJsonFile(args: {path: string; data: Object | ((arg: Object) => void)}) {
    const appRoot = require("app-root-path");
    const prevData = loadJsonFile(args.path);
    const parsedData = JSON.stringify(
        typeof args.data === "function"
            ? { ...args.data(prevData) }
            : { ...prevData, ...args.data },
        null,
        2
    );
    console.log("Writting", appRoot + args.path);
    fs.writeFileSync(appRoot + args.path, parsedData);
    console.log(`Generated ${appRoot}${args.path}`);
};
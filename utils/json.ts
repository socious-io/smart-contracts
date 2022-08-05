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

export function writeJsonFile(args: {data: any, path: string, mode?: string}) {
    const appRoot = require("app-root-path");
    let prevData: any;
    if (args.mode === "a") {
        prevData = loadJsonFile(args.path);
    } else {
        prevData = {}
    }
    const parsedData = JSON.stringify(
        { ...prevData, ...args.data },
        null,
        2
    );
    fs.writeFileSync(appRoot + args.path, parsedData);
    console.log(`Filed written to: ${appRoot}${args.path}`);
};
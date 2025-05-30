'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { activateCustomLogging, log } from './logging';
import { analyzePythonIndentation, handlePythonPaste } from './python_indentation';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    activateCustomLogging(context, false);
    log('The "ProperPythonPasting" extension (by PhoHale) is now active!');

    // Register the smart paste command
    const disposable = vscode.commands.registerCommand('python-smart-paste.pastePython', async () => {
        await handlePythonPaste();
    });

    context.subscriptions.push(disposable);
    
}

// this method is called when your extension is deactivated
export function deactivate() {
}

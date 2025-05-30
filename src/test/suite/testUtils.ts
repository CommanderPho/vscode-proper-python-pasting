import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateCustomLogging, log } from '../../logging';
import { analyzePythonIndentation, handlePythonPaste, testPythonFormatter } from '../../python_indentation';


/**
 * Tests the proper indentation of pasted Python code
 * @param sourceCode The code to be pasted
 * @param expectedResult The expected document content after pasting
 */
export async function testPythonFormatting(
    sourceCode: string,
    expectedResult: string
): Promise<void> {
    
    const formattedContent = testPythonFormatter(sourceCode, 0);
    // Assert the result
    assert.strictEqual(formattedContent, expectedResult);

}


/**
 * Tests the proper indentation of pasted Python code
 * @param sourceCode The code to be pasted
 * @param targetDocument The document content where code will be pasted
 * @param cursorPosition The position where to paste the code
 * @param expectedResult The expected document content after pasting
 */
export async function testPythonPasting(
    sourceCode: string,
    targetDocument: string,
    cursorPosition: vscode.Position,
    expectedResult: string
): Promise<void> {
    // // Create a document with the target content
    // const document = await vscode.workspace.openTextDocument({
    //     content: targetDocument,
    //     language: 'python'
    // });
    
    // const editor = await vscode.window.showTextDocument(document);
    
    // // Set cursor position
    // editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
    
    // // Mock the clipboard content
    // await vscode.env.clipboard.writeText(sourceCode);
    
    // Execute the paste command (your extension should override this for Python files)
    await vscode.commands.executeCommand('properPythonPasting.paste');
    
    const formattedContent = testPythonFormatter(sourceCode, 0);


    // Assert the result
    // assert.strictEqual(document.getText(), expectedResult);

    assert.strictEqual(formattedContent, expectedResult);

    // Close the document
    // await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}


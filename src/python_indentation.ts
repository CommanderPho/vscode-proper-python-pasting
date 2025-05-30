import * as vscode from 'vscode';
import { log } from './logging';

/**
 * Analyzes Python code to determine the indentation level for each line.
 * 
 * @param pythonCode - A string containing potentially multi-line Python code
 * @returns An object containing indentation information:
 *   - levels: Array of indentation levels (integers) for each non-empty line
 *   - indentChar: The character used for indentation ('space' or 'tab')
 *   - indentSize: Number of spaces/tabs per indentation level
 */
export function analyzePythonIndentation(pythonCode: string): {
        levels: number[],
        indentChar: 'space' | 'tab',
        indentSize: number
    } {
        // Split the code into lines
        const lines = pythonCode.split('\n');
        
        // Filter out empty lines and collect indentation information
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        // Extract leading whitespace for each line
        const leadingWhitespaces = nonEmptyLines.map(line => {
            const match = line.match(/^(\s*)/);
            return match ? match[1] : '';
        });
        
        // Determine if spaces or tabs are used for indentation
        const hasTabs = leadingWhitespaces.some(ws => ws.includes('\t'));
        const indentChar: 'space' | 'tab' = hasTabs ? 'tab' : 'space';
        
        // Find the most common non-zero indentation size
        const indentSizes: number[] = [];
        
        for (let i = 1; i < leadingWhitespaces.length; i++) {
            const prevIndent = leadingWhitespaces[i - 1].length;
            const currIndent = leadingWhitespaces[i].length;
            
            // If this line has more indentation than the previous one
            if (currIndent > prevIndent) {
                indentSizes.push(currIndent - prevIndent);
            }
            // If this line has less indentation than the previous one
            else if (currIndent < prevIndent && currIndent > 0) {
                // Find the closest previous line with less indentation
                for (let j = i - 2; j >= 0; j--) {
                    const jIndent = leadingWhitespaces[j].length;
                    if (jIndent < prevIndent && currIndent > jIndent) {
                        indentSizes.push(currIndent - jIndent);
                        break;
                    }
                }
            }
        }
        
        // Determine the most common indent size (default to 4 for spaces, 1 for tabs)
        let indentSize = indentChar === 'space' ? 4 : 1;
        
        if (indentSizes.length > 0) {
            // Find the most frequent value
            const countMap: Record<number, number> = {};
            let maxCount = 0;
            let mostFrequent = indentSize;
            
            for (const size of indentSizes) {
                countMap[size] = (countMap[size] || 0) + 1;
                if (countMap[size] > maxCount) {
                    maxCount = countMap[size];
                    mostFrequent = size;
                }
            }
            
            if (maxCount > 0) {
                indentSize = mostFrequent;
            }
        }
        
        // Calculate indentation levels for each line
        const levels = leadingWhitespaces.map(ws => 
            Math.floor(ws.length / indentSize)
        );
        
        return {
            levels,
            indentChar,
            indentSize
        };
}


/**
 * Strips leading indentation from selected Python code and applies a new base indentation.
 * 
 * @param code - The Python code to process
 * @param targetIndentLevel - The target base indentation level to apply
 * @param indentSize - The number of spaces per indentation level
 * @param indentChar - The character used for indentation ('space' or 'tab')
 * @returns The code with adjusted indentation
 */
function normalizeAndApplyIndentation(
    code: string, 
    targetIndentLevel: number, 
    indentSize: number,
    indentChar: 'space' | 'tab'
): string {
    // Split the code into lines
    const lines = code.split('\n');
    
    // Filter out empty lines for indentation analysis
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    // Extract leading whitespace for each non-empty line
    const leadingWhitespaces = nonEmptyLines.map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    });
    
    // Calculate indentation levels for each line
    const levels = leadingWhitespaces.map(ws => Math.floor(ws.length / indentSize));
    
    // Calculate the minimum indentation level
    const minLevel = levels.length > 0 ? Math.min(...levels) : 0;
    
    // Calculate how many characters to remove from each line
    const charsToRemove = minLevel * indentSize;
    
    // Process each line: remove min indentation, then add target indentation
    const processedLines = lines.map(line => {
        if (line.trim() === '') {
            return ''; // Keep empty lines empty
        }
        
        // Get the leading whitespace
        // Get the leading whitespace
        const match = line.match(/^(\s*)/);
        const leadingWhitespace = match ? match[0] : '';
        
        // Remove the minimum indentation
        const actualCharsToRemove = Math.min(charsToRemove, leadingWhitespace.length);
        const normalizedLine = line.substring(actualCharsToRemove);
        
        // Add the target indentation using the appropriate character
        const indentString = indentChar === 'tab' 
            ? '\t'.repeat(targetIndentLevel) 
            : ' '.repeat(targetIndentLevel * indentSize);
            
        return indentString + normalizedLine;
    });
    
    // Join the lines back together
    return processedLines.join('\n');
}


    
export async function handlePythonPaste() {
        // Check if we're in a notebook cell
        const activeNotebookEditor = vscode.window.activeNotebookEditor;
        const isJupyterCodeCell = activeNotebookEditor && activeNotebookEditor.notebook.cellAt(activeNotebookEditor.selection.start)?.kind === vscode.NotebookCellKind.Code;

        // Regular editor check
        const editor = vscode.window.activeTextEditor;
        const isPythonFile = editor?.document.languageId === 'python';

        if (!editor || (!isPythonFile && !isJupyterCodeCell)) {
                // Fall back to default paste
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                return;
        }
        
        // Get clipboard content
        const clipboardContent = await vscode.env.clipboard.readText();
        if (!clipboardContent) {
            // Nothing to paste
            return;
        }
    
        // Analyze the indentation of the clipboard content
        const clipboardIndentation = analyzePythonIndentation(clipboardContent);
        log('Current clipboard code indentation depths:', clipboardIndentation);


        // Get the current line and its indentation
        const position = editor.selection.active;
        const currentLine = editor.document.lineAt(position.line);
        const currentIndentMatch = currentLine.text.match(/^(\s*)/);
        const currentIndent = currentIndentMatch ? currentIndentMatch[1] : '';
        
        // Determine target indentation level
        let targetIndentLevel = 0;
        
        // If the cursor is at an empty line, use the indentation of the previous non-empty line
        if (currentLine.isEmptyOrWhitespace) {
            for (let i = position.line - 1; i >= 0; i--) {
                const prevLine = editor.document.lineAt(i);
                if (!prevLine.isEmptyOrWhitespace) {
                    const prevIndentMatch = prevLine.text.match(/^(\s*)/);
                    const prevIndent = prevIndentMatch ? prevIndentMatch[1] : '';
                    
                    // Check if the previous line ends with a colon (indicating a new block)
                    if (prevLine.text.trim().endsWith(':')) {
                        targetIndentLevel = prevIndent.length / clipboardIndentation.indentSize + 1;
                    } else {
                        targetIndentLevel = prevIndent.length / clipboardIndentation.indentSize;
                    }
                    break;
                }
            }
        } else {
            // Use the current line's indentation
            targetIndentLevel = currentIndent.length / clipboardIndentation.indentSize;
            
            // If we're at the end of a line that ends with a colon, increase indentation
            if (currentLine.text.trim().endsWith(':') && position.character >= currentLine.range.end.character) {
                targetIndentLevel++;
            }
        }
        log('targetIndentLevel:', targetIndentLevel);



        // Reformat the clipboard content with the target indentation
        // Process the clipboard content: normalize and apply target indentation
        const formattedContent = normalizeAndApplyIndentation(
            clipboardContent, 
            targetIndentLevel, 
            clipboardIndentation.indentSize,
            clipboardIndentation.indentChar
        );
        log('formattedContent:', formattedContent, '\n\n');

        // Insert the formatted content
        editor.edit(editBuilder => {
            if (editor.selection.isEmpty) {
                editBuilder.insert(position, formattedContent);
            } else {
                editBuilder.replace(editor.selection, formattedContent);
            }
        });
    }
    


/**
 * Strips leading indentation from selected Python code so that the minimum indentation level becomes 0.
 */
async function stripLeadingIndentation() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'python') {
            vscode.window.showInformationMessage('This command only works with Python files.');
            return;
        }
    
        // Check if there's a selection
        if (editor.selection.isEmpty) {
            vscode.window.showInformationMessage('Please select some Python code first.');
            return;
        }
    
        // Get the selected text
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        // Analyze the indentation of the selected text
        const indentationInfo = analyzePythonIndentation(selectedText);
        
        // Process the selected text: normalize and apply zero indentation
        const formattedText = normalizeAndApplyIndentation(
            selectedText, 
            0, 
            indentationInfo.indentSize,
            indentationInfo.indentChar
        );
        
        // Replace the selected text with the formatted text
        editor.edit(editBuilder => {
            editBuilder.replace(selection, formattedText);
        }).then(success => {
            if (success) {
                const minLevel = indentationInfo.levels.length > 0 ? Math.min(...indentationInfo.levels) : 0;
                vscode.window.showInformationMessage(`Removed ${minLevel} level(s) of indentation.`);
            }
        });
}

    
/**
 * Test function to demonstrate the analyzer with the provided example
 */
export function testPythonFormatter(sourceCode: string, targetIndentLevel: number = 0) {

    // Analyze the indentation of the clipboard content
    const clipboardIndentation = analyzePythonIndentation(sourceCode);
    log('Current clipboard code indentation depths:', clipboardIndentation);
    
    // Reformat the clipboard content with the target indentation
    // Process the clipboard content: normalize and apply target indentation
    const formattedContent = normalizeAndApplyIndentation(
        sourceCode, 
        targetIndentLevel, 
        clipboardIndentation.indentSize,
        clipboardIndentation.indentChar
    );
    log('formattedContent:', formattedContent, '\n\n');
    return formattedContent;
}




    

function testAnalyzer() {
        const pythonCode = `            pbe_trained_decoder_search_context = IdentifyingContext(trained_compute_epochs='laps', pfND_ndim=1, decoder_identifier='pseudo2D', known_named_decoding_epochs_type='pbe', masked_time_bin_fill_type=('ignore', 'nan_filled', 'dropped'), data_grain='per_time_bin') # , data_grain= 'per_time_bin -- not really relevant: ['masked_time_bin_fill_type', 'known_named_decoding_epochs_type', 'data_grain']
                # laps_trained_decoder_search_context = IdentifyingContext(trained_compute_epochs='laps', pfND_ndim=1, decoder_identifier='pseudo2D', known_named_decoding_epochs_type='laps', masked_time_bin_fill_type='dropped', data_grain='per_time_bin')
                flat_context_list, flat_result_context_dict, flat_decoder_context_dict, flat_decoded_marginal_posterior_df_context_dict = a_new_fully_generic_result.get_results_matching_contexts(context_query=pbe_trained_decoder_search_context, return_multiple_matches=True, debug_print=True)`;

        const result = analyzePythonIndentation(pythonCode);
        console.log('Indentation levels:', result.levels);
        console.log('Indentation character:', result.indentChar);
        console.log('Indentation size:', result.indentSize);
}

    
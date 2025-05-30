//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//
// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { activateCustomLogging, log } from '../../logging';
import { analyzePythonIndentation, handlePythonPaste } from '../../python_indentation';

import { testPythonPasting } from './testUtils';

// Defines a Mocha test suite to group tests of similar kind together
suite('ProperPythonPasting Extension Tests', () => {

    // Setup - runs before all tests
    suiteSetup(async () => {
        // Activate the extension
        await vscode.extensions.getExtension('yourPublisherId.properpythonpasting')?.activate();
    });

    // Test cases
    test('Paste unindented code into unindented context', async () => {
        await testPythonPasting(
            // Source code to paste
            'def example():\n    print("hello")',
        
            // Target document
            'import os\n\n',
        
            // Cursor position (line 2, column 0)
            new vscode.Position(2, 0),
        
            // Expected result
            'import os\n\ndef example():\n    print("hello")'
        );
    });

    test('Paste unindented code into indented context', async () => {
        await testPythonPasting(
            // Source code to paste
            'print("hello")\nprint("world")',
        
            // Target document
            'def function():\n    pass\n    ',
        
            // Cursor position (line 2, column 4)
            new vscode.Position(2, 4),
        
            // Expected result
            'def function():\n    pass\n    print("hello")\n    print("world")'
        );
    });

    test('Paste indented code into deeper indented context', async () => {
        await testPythonPasting(
            // Source code to paste (already has one level of indentation)
            '    if condition:\n        print("nested")',
        
            // Target document
            'def function():\n    for i in range(10):\n        ',
        
            // Cursor position (line 2, column 8)
            new vscode.Position(2, 8),
        
            // Expected result
            'def function():\n    for i in range(10):\n        if condition:\n            print("nested")'
        );
    });

    test('Paste multi-level indented code', async () => {
        await testPythonPasting(
            // Source code with multiple indentation levels
            'if condition:\n    print("level 1")\n    if nested:\n        print("level 2")',
        
            // Target document
            'def function():\n    ',
        
            // Cursor position (line 1, column 4)
            new vscode.Position(1, 4),
        
            // Expected result
            'def function():\n    if condition:\n        print("level 1")\n        if nested:\n            print("level 2")'
        );
    });

    test('Paste code with blank lines', async () => {
        await testPythonPasting(
            // Source code with blank lines
            'print("first")\n\nprint("after blank")',
        
            // Target document
            'def function():\n    ',
        
            // Cursor position (line 1, column 4)
            new vscode.Position(1, 4),
        
            // Expected result
            'def function():\n    print("first")\n    \n    print("after blank")'
        );
    });

    test('Paste code with comments', async () => {
        await testPythonPasting(
            // Source code with comments
            '# This is a comment\nprint("code")\n# Another comment',
        
            // Target document
            'def function():\n    ',
        
            // Cursor position (line 1, column 4)
            new vscode.Position(1, 4),
        
            // Expected result
            'def function():\n    # This is a comment\n    print("code")\n    # Another comment'
        );
    });

    // Add more test cases for different scenarios
});

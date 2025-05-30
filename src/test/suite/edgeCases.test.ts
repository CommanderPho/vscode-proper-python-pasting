import * as vscode from 'vscode';
import { activateCustomLogging, log } from '../../logging';
import { analyzePythonIndentation, handlePythonPaste } from '../../python_indentation';

import { testPythonPasting } from './testUtils';


suite('ProperPythonPasting Edge Cases', () => {
    
    test('Paste into empty document', async () => {
        await testPythonPasting(
            'print("hello")',
            '',
            new vscode.Position(0, 0),
            'print("hello")'
        );
    });
    
    test('Paste code with mixed tabs and spaces', async () => {
        await testPythonPasting(
            'if True:\n\tprint("tabbed")\n    print("spaced")',
            'def function():\n    ',
            new vscode.Position(1, 4),
            'def function():\n    if True:\n        print("tabbed")\n        print("spaced")'
        );
    });
    
    test('Paste code with docstrings', async () => {
        await testPythonPasting(
            '"""This is a\nmultiline\ndocstring"""\ndef func():\n    pass',
            'class MyClass:\n    ',
            new vscode.Position(1, 4),
            'class MyClass:\n    """This is a\n    multiline\n    docstring"""\n    def func():\n        pass'
        );
    });
    
    test('Paste at the beginning of an indented line', async () => {
        await testPythonPasting(
            'print("prepend")\n',
            'def function():\n    print("existing")',
            new vscode.Position(1, 4), // At the beginning of the indented line
            'def function():\n    print("prepend")\n    print("existing")'
        );
    });
});
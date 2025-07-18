# Sladify User Guide

Sladify is a Slack bot that allows you to easily execute Dify workflows from Slack.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Command List](#command-list)
- [How to Execute Workflows](#how-to-execute-workflows)
- [FAQ](#faq)

## Basic Usage

Mention the Sladify bot (`@sladify`) in Slack to execute commands.

```
@sladify [command] [arguments...]
```

## Command List

### 1. Show Workflow List
View the list of registered workflows.

```
@sladify list
```

**Example output:**
```
Registered MCP servers:
• weather-bot - Get weather forecast
• translator - Text translation
• summarizer - Text summarization
```

### 2. Show Workflow Details
View detailed information about a specific workflow (required parameters, etc.).

```
@sladify tool [workflow-name]
```

**Example:**
```
@sladify tool weather-bot
```

### 3. Show Help
Display quick help for usage.

```
@sladify help
```

## How to Execute Workflows

There are two ways to execute workflows.

### Method 1: Interactive Form (Recommended)

When there are multiple parameters or you're unsure what parameters are needed, using the form is convenient.

```
@sladify [workflow-name]
```

**Example:**
```
@sladify weather-bot
```

This will display an input form like:

![Form example](./images/form-example.png)

- Required fields are marked with `*`
- You can add line breaks in text fields with `Shift+Enter`
- Click the "Execute" button after filling all fields

### Method 2: Direct Execution

For workflows with only one parameter, you can execute directly by specifying the value.

```
@sladify [workflow-name] [value]
```

**Example:**
```
@sladify translator Hello world
```

**Note:** For workflows with 2 or more parameters, please use the form.

## FAQ

### Q: Workflow won't execute
**A:** Please check:
- Is the workflow name correct? (Check with `@sladify list`)
- Are all required parameters filled?
- Is the bot added to the channel?

### Q: Results aren't displayed
**A:** Workflow processing may take time. Wait a moment, and if results still don't appear, contact your administrator.

### Q: How to input multi-line text?
**A:** In text input fields, you can add line breaks with `Shift+Enter`. The form shows a hint "Press Shift+Enter for line breaks".

### Q: An error occurred
**A:** Check the error message and try:
- Verify parameter format is correct (e.g., no text in numeric fields)
- Ask administrator if workflow is configured correctly

### Q: Want to add a new workflow
**A:** Administrator privileges are required. Provide your administrator with:
- Workflow name
- Dify workflow URL
- Required parameters

## Troubleshooting

### Bot Not Responding
1. Check you're mentioning `@sladify` correctly
2. Check if bot is online (green dot on profile icon)
3. Verify bot is added to the channel

### Parameter Errors
- Enter only numbers in numeric fields
- Required fields (marked with `*`) must be filled
- Select from provided options in selection fields

## Support

If problems persist, contact your administrator on Slack or report with:
- Command executed
- Error message (if any)
- Time of occurrence

---

*Last updated: July 2024*
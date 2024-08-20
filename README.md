## NoArg - CLI Argument Parser

### Introduction

`noarg` is a lightweight Node.js package designed to simplify command-line argument parsing for CLI applications. With `noarg`, you can effortlessly define and parse command-line arguments and options, making it easier to build robust and user-friendly command-line interfaces.

### Installation

To install `noarg` package, you can use npm:

```bash
npm install noarg
```

### Command Structure

```sh
app [command] [fixed length arguments] [any length arguments] [options]
```

### Getting Started

#### Importing the Package

You can import `noarg` into your Node.js application as follows:

```javascript
import NoArg, { t } from 'noarg'
```

#### Creating a Command

You can create a command with `noarg.create()` method. Each command can have its own set of options, arguments, and configurations.

```javascript
const app = NoArg.create(commandName, commandConfig).on(commandHandler)
```

- `commandName`: Name of the command.
- `commandConfig`: Configuration object for the command.
- `commandHandler`: Function to handle the command execution.

### Example

```javascript
const app = NoArg.create('app', {
  description: 'This is a test program',
  options: {
    config: t.string().global().ask('Where is the config?'),
  },
  arguments: [
    { name: 'arg-1', type: t.number() },
    { name: 'arg-2', type: t.boolean() },
    { name: 'arg-3', type: t.string() },
  ],
  optionalArguments: [
    { name: 'arg-4', type: t.string() },
    { name: 'arg-5', type: t.boolean() },
  ],
  listArgument: {
    name: 'args',
    type: t.string(),
    minLength: 1,
    maxLength: 3,
  },
  config: {},
}).on(([arg1, arg2, arg3, optArg4, optArg5, listArg], flags) => {
  console.log({ arg1, arg2, arg3, optArg4, optArg5, listArg })
  console.log(flags)
})
```

### Example: Command Structure

```sh
node app.js arg-1 arg-2 arg-3 optional-arg-1 listArg-1 listArg-2 --config config.json
```

#### Types

- `t.string()`: Defines an option of type string.
- `t.number()`: Defines an option of type number.
- `t.boolean()`: Defines an option of type boolean.
- `t.array()`: Defines an option of type array. (Only available for options)
- `t.tuple()`: Defines an option of type tuple. (Only available for options)

### Tips

- Help option is automatically available.
- Another awesome feature is that it shows how to use this CLI and its structure, which can be seen using the `--help-usage` flag.

### Example

```sh
node app.js --help
node app.js --help-usage
```

### Conclusion

`noarg` simplifies the process of parsing command-line arguments for Node.js applications. With its intuitive API and powerful features, you can easily build CLI applications with robust argument handling.

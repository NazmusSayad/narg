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
const app = NoArg.create(commandName, commandConfig, commandHandler)
```

- `commandName`: Name of the command.
- `commandConfig`: Configuration object for the command.
- `commandHandler`: Function to handle the command execution.

### Example

```javascript
const app = NoArg.create(
  'app',
  {
    description: 'This is a test program',
    options: {
      config: t.string().global(),
    },
    arguments: [
      { name: 'arg-1', type: t.number() },
      { name: 'arg-2', type: t.boolean() },
      { name: 'arg-3' },
    ],
    listArgument: {
      name: 'args',
      type: t.string(),
      minLength: 1,
      maxLength: 3,
    },
    config: {},
  },
  (args, options) => {
    console.log({ app: args })
  }
)
```

### Example: Command Structure

```sh
node app.js arg-1 true arg-3 listArgs-1 listArgs-2 --config config.json
```

#### Types

- `t.string()`: Defines an option of type string.
- `t.number()`: Defines an option of type number.
- `t.boolean()`: Defines an option of type boolean.
- `t.array()`: Defines an option of type array. (Only available for options)
- `t.tuple()`: Defines an option of type tuple. (Only available for options)

### Tips

- Help option is automatically available.
- Add `--use` or `-u` option just after `--help` or `-h` option to see how to use it
  ### Example
  ```sh
  node app.js --help --use
  node app.js -h -u
  ```

### Conclusion

`noarg` simplifies the process of parsing command-line arguments for Node.js applications. With its intuitive API and powerful features, you can easily build CLI applications with robust argument handling.

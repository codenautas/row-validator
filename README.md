# row-validator
Row validator

[![Node.js CI](https://github.com/codenautas/row-validator/workflows/Node.js%20CI/badge.svg)](https://github.com/codenautas/row-validator/actions?query=workflow%3A%22Node.js+CI%22)
[![Coverage Status](https://coveralls.io/repos/github/codenautas/row-validator/badge.svg?branch=master)](https://coveralls.io/github/codenautas/row-validator?branch=master)

# Example

```ts
import { getRowValidator, Structure } from "../lib/row-validator";

type SimpleRow={v1:string|null, v2:number|null, v3:number|null, v4:string|null}

var rowValidator = getRowValidator({});
var simpleStruct:Structure<keyof SimpleRow>={
    variables:{
        v1:{tipo:'texto'},
        v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
        v3:{tipo:'numerico', minimo:0, maximo:98},
        v4:{tipo:'texto'}
    }
}

var row:SimpleRow = {v1:'alpha', v2:1, v3:null, v4:'b'}
var state = rowValidator(simpleStruct, rowVacia);
console.log(state);
/*
{
    resumen:'ok',
    estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'valida'},
    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
    actual:null,
    primeraFalla:null,
}
*/

```
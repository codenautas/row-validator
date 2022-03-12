# row-validator
Validator de registros provenientes de formularios

Especialmente diseñado para encuestas

![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/row-validator.svg)](https://npmjs.org/package/row-validator)
[![downloads](https://img.shields.io/npm/dm/row-validator.svg)](https://npmjs.org/package/row-validator)
[![build](https://github.com/codenautas/actions/workflows/node.js.yml/badge.svg)](https://github.com/codenautas/row-validator/actions/workflows/node.js.yml)
[![coverage](https://coveralls.io/repos/github/codenautas/row-validator/badge.svg)](https://coveralls.io/github/codenautas/row-validator)
[![outdated-deps](https://img.shields.io/github/issues-search/codenautas/row-validator?color=9cf&label=outdated-deps&query=is%3Apr%20author%3Aapp%2Fdependabot%20is%3Aopen)](https://github.com/codenautas/row-validator/pulls/app%2Fdependabot)


# Estructura

El validador necesita conocer la estructura de la encuesta:
```js
export type Valor = string | number | boolean | null

export interface Opcion<V>{
    salto?:V|null         // Destino del salto para la opción seleccionada
}

export interface Variable<V, FH, FIN>{
    optativa?:boolean     // Obligatoriedad el ingreso de la variable
    salto?:V|FIN|null     // Destino del salto en caso de saltos icondicionales
    tipo:'opciones'|'numerico'|'texto'|string
    opciones?:{[k in string|number]:Opcion<V|FIN>}
    maximo?:number|null   // Máximo valor válido
    minimo?:number|null   // Míximo valor válido
    // Para variables de especifique dependientes de una opción:
        subordinadaVar?:V|null           // variable de la que depende
        subordinadaValor?:Valor|null     // valor que la activa
    saltoNsNr?:V|FIN|null       // Salto en el caso de no respuesta o NS/NC
    calculada?:boolean|null     // Si la variable es calculada (no ingresada)
    funcionHabilitar?:FH|null   // Determina la habilitación dinámica
    libre?:boolean|null         // Posibilidad de ingresarla aunque esté salteada
}
```

# Ejemplo

```ts
import { getRowValidator, Structure } from "../lib/row-validator";

type SimpleRow={v1:string|null, v2:number|null, v3:number|null, v4:string|null}

var rowValidator = getRowValidator({});
var simpleStruct:Structure<keyof SimpleRow>={
    marcaFin:'FIN',
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
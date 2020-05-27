"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-env node*/
/* global describe */
/* global it */

import * as discrepances from "discrepances";
import { getRowValidator, Structure } from "../lib/row-validator";

type SimpleRow={v1:string|null, v2:number|null, v3:number|null, v4:string|null}
type RowConSubordinadas=SimpleRow & {v2_esp:string|null}
type DesordenRow=SimpleRow & {v9:number|null, v11:number|null}

describe('row-validator', function(){
    var rowValidator = getRowValidator({});
    var simpleStruct:Structure<keyof SimpleRow>={
        variables:{
            v1:{tipo:'texto'},
            v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
            v3:{tipo:'numerico', minimo:0, maximo:98},
            v4:{tipo:'texto'}
        }
    }
    it("calcula un registro vacío", function(){
        var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:null}
        var state = rowValidator(simpleStruct, rowVacia);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'actual', v2:'todavia_no', v3:'todavia_no', v4:'todavia_no'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v1',
                primeraVacia:'v1',
                primeraFalla:null,
            }
        )
    })
    it("calcula una variable omitida", function(){
        var row:SimpleRow = {v1:'A', v2:null, v3:1, v4:null}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v2',
                primeraVacia:'v2',
                primeraFalla:'v2',
            }
        )
    })
    it("calcula dos variables omitidas", function(){
        var row:SimpleRow = {v1:'A', v2:null, v3:null, v4:'B'}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v2',
                primeraVacia:'v2',
                primeraFalla:'v2',
            }
        )
    })
    it("marca un salto", function(){
        var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'actual'},
                siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:null,
            }
        )
    })
    it("una salteada está marcada", function(){
        var row:SimpleRow = {v1:'A', v2:1, v3:1, v4:null}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_flujo_por_salto', v4:'actual'},
                siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    })
    it("opcion invalida", function(){
        var row:SimpleRow = {v1:'A', v2:15, v3:1, v4:null}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'invalida', v3:'valida', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v2',
            }
        )
    })
    it("sobre máximo", function(){
        var row:SimpleRow = {v1:'A', v2:2, v3:99, v4:null}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_rango', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    })
    it("sobre máximo 0");
    it("bajo mínimo", function(){
        var row:SimpleRow = {v1:'A', v2:2, v3:-2, v4:null}
        var state = rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_rango', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    })
    it("optativa llena con salto", function(){
        var saltoIncondicionalStruct:Structure<keyof DesordenRow>={
            variables:{
                v9:{tipo:'numerico'},
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}, saltoNsNr:'v11'},
                v3:{tipo:'numerico', salto:'v11'},
                v4:{tipo:'texto'},
                v11:{tipo:'numerico'}
            }
        }
        var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:22, v4:null, v11:null}
        var state = rowValidator(saltoIncondicionalStruct, row);
        discrepances.showAndThrow(
            state,
            {
                estados:{v9:'valida', v1:'valida', v2:'valida', v3:'valida', v4:'salteada', v11:'actual'},
                siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:'v11', v4:'v11', v11:null},
                actual:'v11',
                primeraVacia:'v11',
                primeraFalla:null,
            }
        )
    })
    describe("variables subordinadas", function(){
        var conSubordinadaStruct:Structure<keyof RowConSubordinadas>={
            variables:{
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}, 3:{}}},
                v2_esp:{tipo:'texto', subordinadaVar:'v2', subordinadaValor:3},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto'}
            }
        }
        it("completa salvo la subordinada", function(){
            var row:RowConSubordinadas = {v1:'A', v2:2, v2_esp:null, v3:1, v4:'B'}
            var state = rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'valida', v2:'valida', v2_esp:'salteada', v3:'valida', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v3', v2_esp:null, v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("la subordinada está marcada de más", function(){
            // TODO: en vez de fuera_de_flujo_por_salto debería haber un nuevo estilo fuera_de_flujo_por_no_habilitada
            var row:RowConSubordinadas = {v1:'A', v2:2, v2_esp:'X', v3:1, v4:'B'}
            var state = rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'valida', v2:'valida', v2_esp:'fuera_de_flujo_por_salto', v3:'valida', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v3', v2_esp:null, v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:'v2_esp',
                }
            )
        })
    })
    describe("variables calculadas", function(){
        var calculadasInicialFinalStruct:Structure<keyof SimpleRow>={
            variables:{
                v1:{tipo:'texto', calculada:true},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto', calculada:true}
            }
        }
        var calculadasIntermedias:Structure<keyof DesordenRow>={
            variables:{
                v9:{tipo:'numerico'},
                v1:{tipo:'texto', calculada:true},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto', calculada:true},
                v11:{tipo:'numerico'},
            }
        }
        it("salta a la calculada final", function(){
            // TODO: marca como siguiente la calculada
            var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
            var state = rowValidator(calculadasInicialFinalStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'calculada', v2:'valida', v3:'salteada', v4:'calculada'},
                    siguientes:{v1:null, v2:'v4', v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("salta a la calculada final", function(){
            // TODO: marca como siguiente la calculada
            var row:DesordenRow = {v9:1, v1:'A', v2:1, v3:null, v4:null, v11:null}
            var state = rowValidator(calculadasIntermedias, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v9:'valida', v1:'calculada', v2:'valida', v3:'salteada', v4:'calculada', v11:'actual'},
                    siguientes:{v9:'v2', v1:null, v2:'v11', v3:'v11', v4:null, v11:null},
                    actual:'v11',
                    primeraFalla:null,
                }
            )
        })
        it("variable calculada posterior a la actual")
    });
    describe("variables optativas", function(){
        var la1OptativaStruct:Structure<keyof SimpleRow>={
            variables:{
                v1:{tipo:'texto', optativa:true},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto'}
            }
        }
        var la3OptativaStruct:Structure<keyof DesordenRow>={
            variables:{
                v9:{tipo:'numerico'},
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}, saltoNsNr:'v11'},
                v3:{tipo:'opciones', opciones:{1:{salto:'v11'}, 2:{}}, optativa:true, salto:'v11'},
                v4:{tipo:'texto'},
                v11:{tipo:'numerico'}
            }
        }
        it("calcula un registro vacío", function(){
            var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:null}
            var state = rowValidator(la1OptativaStruct, rowVacia);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'optativa_sd', v2:'actual', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("calcula una variable omitida", function(){
            var row:SimpleRow = {v1:null, v2:null, v3:1, v4:null}
            var state = rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'optativa_sd', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v1',
                    primeraFalla:'v2',
                }
            )
        })
        it("marca un salto", function(){
            var row:SimpleRow = {v1:null, v2:1, v3:null, v4:null}
            var state = rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'optativa_sd', v2:'valida', v3:'salteada', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("optativa presente", function(){
            var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
            var state = rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v4',
                    primeraFalla:null,
                }
            )
        })
        it("una salteada está marcada", function(){
            var row:SimpleRow = {v1:null, v2:1, v3:1, v4:null}
            var state = rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v1:'optativa_sd', v2:'valida', v3:'fuera_de_flujo_por_salto', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v1',
                    primeraFalla:'v3',
                }
            )
        })
        it("optativa con salto", function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:null, v4:null, v11:null}
            var state = rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'optativa_sd', v4:'salteada', v11:'actual'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:'v11', v4:'v11', v11:null},
                    actual:'v11',
                    primeraVacia:'v3',
                    primeraFalla:null,
                }
            )
        })
        it("nsnr con salto", function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:-9, v3:null, v4:null, v11:null}
            var state = rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'salteada', v4:'salteada', v11:'actual'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v11', v3:'v11', v4:'v11', v11:null},
                    actual:'v11',
                    primeraVacia:'v11',
                    primeraFalla:null,
                }
            )
        })
        it("nsnr sin salto", function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:-9, v4:null, v11:null}
            var state = rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'valida', v4:'actual', v11:'todavia_no'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:'v4', v4:'v11', v11:null},
                    actual:'v4',
                    primeraVacia:'v4',
                    primeraFalla:null,
                }
            )
        })
    })
});

describe('row-validator setup', function(){
    var rowValidator = getRowValidator({});
    var simpleRow:Structure<string>={
        variables:{
            v1:{tipo:'texto', funcionHabilitar:'inexistente'},
        }
    }
    it("calcula un registro vacío", function(){
        try{
            rowValidator(simpleRow, {v1:null});
            throw new Error('debia fallar');
        }catch(err){
            discrepances.showAndThrow(err,new Error('rowValidator error. No existe la funcion habilitadora inexistente'));
        }
    })
    it("tipo opciones sin opciones", function(){
        try{
            rowValidator({variables:{v1:{tipo:'opciones'}}}, {v1:1});
            throw new Error('debia fallar');
        }catch(err){
            discrepances.showAndThrow(err,new Error("rowValidator error. Variable \"v1\" sin opciones"));
        }
    })
});

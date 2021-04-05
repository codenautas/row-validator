"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-env node*/
/* global describe */
/* global it */

import { strict as assert } from "assert";

import * as discrepances from "discrepances";
import { FormStructureState, getRowValidator, Structure, RowData, OpcionesRowValidator } from "../lib/row-validator";

import * as bestGlobals from "best-globals";

type SimpleRow={v1:string|null, v2:number|null, v3:number|null, v4:string|null}
type DatedRow={v1:string|null, v2:number|null, v3:Date|null, v4:string|null}
type RowConSubordinadas=SimpleRow & {v2_esp:string|null}
type DesordenRow=SimpleRow & {v9:number|null, v11:number|null}

function getRowValidatorSinMultiestado(opts?:any){
    var rowValidatorInterno = getRowValidator({multiEstado:false, ...opts});
    return <V extends string, FIN>(estructura: Structure<V, FIN, string>, formData: RowData<V>, opts?:OpcionesRowValidator):Omit<FormStructureState<V, FIN>,'feedback'|'feedbackResumen'> => {
        return rowValidatorInterno(estructura,formData,opts);
    }
   
}

describe('row-validator', function(){
    var rowValidator = getRowValidatorSinMultiestado()
    var simpleStruct:Structure<keyof SimpleRow>={
        variables:{
            v1:{tipo:'texto'},
            v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
            v3:{tipo:'numerico', minimo:0, maximo:98},
            v4:{tipo:'texto'}
        }
    }
    it("calcula un registro vacío (null y undefined)", async function(){
        //@ts-expect-error v4 no debería ser undefined, sin embargo el validator lo tiene que tomar como null
        var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:undefined}
        var state = await rowValidator(simpleStruct, rowVacia);
        discrepances.showAndThrow(
            state,
            {
                resumen:'vacio',
                estados:{v1:'actual', v2:'todavia_no', v3:'todavia_no', v4:'todavia_no'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v1',
                primeraVacia:'v1',
                primeraFalla:null,
            }
        )
    })
    it("calcula una variable omitida", async function(){
        var row:SimpleRow = {v1:'A', v2:null, v3:1, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v2',
                primeraVacia:'v2',
                primeraFalla:'v2',
            }
        )
    })
    it("calcula dos variables omitidas", async function(){
        var row:SimpleRow = {v1:'A', v2:null, v3:null, v4:'B'}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v2',
                primeraVacia:'v2',
                primeraFalla:'v2',
            }
        )
    })
    it("marca un salto", async function(){
        var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'incompleto',
                estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'actual'},
                siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:null,
            }
        )
    })
    it("una salteada está marcada", async function(){
        var row:SimpleRow = {v1:'A', v2:1, v3:1, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_flujo_por_salto', v4:'actual'},
                siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    })
    it("opcion invalida", async function(){
        var row:SimpleRow = {v1:'A', v2:15, v3:1, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'invalida', v3:'valida', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v2',
            }
        )
    })
    it("sobre máximo", async function(){
        var row:SimpleRow = {v1:'A', v2:2, v3:99, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_rango', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    })
    it("sobre máximo 0", async function(){
        var simpleStruct2:Structure<keyof SimpleRow>={
            variables:{
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico', minimo:-10, maximo:0},
                v4:{tipo:'texto'}
            }
        }
        var row:SimpleRow = {v1:'A', v2:2, v3:3, v4:null};
        var state = await rowValidator(simpleStruct2, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_rango', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    });
    it("bajo mínimo", async function(){
        var row:SimpleRow = {v1:'A', v2:2, v3:-2, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'valida', v3:'fuera_de_rango', v4:'actual'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v4',
                primeraVacia:'v4',
                primeraFalla:'v3',
            }
        )
    })
    it("optativa llena con salto", async function(){
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
        var state = await rowValidator(saltoIncondicionalStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'incompleto',
                estados:{v9:'valida', v1:'valida', v2:'valida', v3:'valida', v4:'salteada', v11:'actual'},
                siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:'v11', v4:'v11', v11:null},
                actual:'v11',
                primeraVacia:'v11',
                primeraFalla:null,
            }
        )
    })
    describe("variables subordinadas", async function(){
        var conSubordinadaStruct:Structure<keyof RowConSubordinadas>={
            variables:{
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}, 3:{}}},
                v2_esp:{tipo:'texto', subordinadaVar:'v2', subordinadaValor:3},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto'}
            }
        }
        it("completa, la subordinada no corresponde", async function(){
            var row:RowConSubordinadas = {v1:'A', v2:2, v2_esp:null, v3:1, v4:'B'}
            var state = await rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v1:'valida', v2:'valida', v2_esp:'salteada', v3:'valida', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v3', v2_esp:null, v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("completa falta la subordinada", async function(){
            var row:RowConSubordinadas = {v1:'A', v2:3, v2_esp:null, v3:1, v4:'B'}
            var state = await rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'valida', v2_esp:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v2_esp', v2_esp:'v3', v3:'v4', v4:null},
                    actual:'v2_esp',
                    primeraVacia:'v2_esp',
                    primeraFalla:'v2_esp',
                }
            )
        })
        it("la subordinada está marcada de más", async function(){
            var row:RowConSubordinadas = {v1:'A', v2:2, v2_esp:'X', v3:1, v4:'B'}
            var state = await rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'valida', v2_esp:'fuera_de_flujo_por_salto', v3:'valida', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v3', v2_esp:null, v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:'v2_esp',
                }
            )
        })
    })
    describe("variables subordinadas en pregunta con salto incondicional", async function(){
        var conSubordinadaStruct:Structure<keyof RowConSubordinadas>={
            variables:{
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}, 3:{}}, salto:'v4'},
                v2_esp:{tipo:'texto', subordinadaVar:'v2', subordinadaValor:3},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto'}
            }
        }
        it("completa, la subordinada no corresponde", async function(){
            var row:RowConSubordinadas = {v1:'A', v2:2, v2_esp:null, v3:null, v4:'B'}
            var state = await rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v1:'valida', v2:'valida', v2_esp:'salteada', v3:'salteada', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v4', v2_esp:'v4', v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("completa falta la subordinada", async function(){
            var row:RowConSubordinadas = {v1:'A', v2:3, v2_esp:null, v3:1, v4:'B'}
            var state = await rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'valida', v2_esp:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v2_esp', v2_esp:'v3', v3:'v4', v4:null},
                    actual:'v2_esp',
                    primeraVacia:'v2_esp',
                    primeraFalla:'v2_esp',
                }
            )
        })
        it("la subordinada está marcada de más", async function(){
            var row:RowConSubordinadas = {v1:'A', v2:2, v2_esp:'X', v3:null, v4:'B'}
            var state = await rowValidator(conSubordinadaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'valida', v2_esp:'fuera_de_flujo_por_salto', v3:'salteada', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v4', v2_esp:'v4', v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:'v2_esp',
                }
            )
        })
    })
    describe("variables calculadas", async function(){
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
                v2:{tipo:'opciones', opciones:{1:{salto:'v11'}, 2:{}}},
                v3:{tipo:'numerico'},
                v4:{tipo:'texto', calculada:true},
                v11:{tipo:'numerico'},
            }
        }
        it("salta a la calculada final", async function(){
            var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
            var state = await rowValidator(calculadasInicialFinalStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v1:'calculada', v2:'valida', v3:'salteada', v4:'calculada'},
                    siguientes:{v1:null, v2:'v4', v3:'v4', v4:null}, 
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("saltaea la calculada y va la última", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:1, v3:null, v4:null, v11:null}
            var state = await rowValidator(calculadasIntermedias, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v9:'valida', v1:'calculada', v2:'valida', v3:'salteada', v4:'calculada', v11:'actual'},
                    siguientes:{v9:'v2', v1:null, v2:'v11', v3:'v11', v4:null, v11:null},
                    actual:'v11',
                    primeraVacia:'v11',
                    primeraFalla:null,
                }
            )
        })
        it("variable calculada posterior a la actual", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:null, v3:null, v4:'calculada', v11:null}
            var state = await rowValidator(calculadasIntermedias, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v9:'valida', v1:'calculada', v2:'actual', v3:'todavia_no', v4:'calculada', v11:'todavia_no'},
                    siguientes:{v9:'v2', v1:null, v2:'v3', v3:'v11', v4:null, v11:null},
                    actual:'v2',
                    primeraVacia:'v2',
                    primeraFalla:null,
                }
            )
        })
        describe("funcionHabilitar", function(){
            var getFuncionHabilitar=(nombre:string)=>{
                switch(nombre){
                    case 'v1eq1':
                        return (formData:RowData<string>)=>formData.v1==1;
                    default:
                        throw new Error('no encontrado')
                }
            };
            var rowValidator = getRowValidator({
                getFuncionHabilitar,
            });
            var simpleStruct:Structure<keyof SimpleRow>={
                variables:{
                    v1:{tipo:'texto'},
                    v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}, funcionHabilitar:'v1eq1'},
                    v3:{tipo:'numerico', minimo:0, maximo:98, funcionHabilitar:'v1eq1'},
                    v4:{tipo:'texto'}
                }
            }
            var NULL = (_loQueMeGustaríaQueDeEnElFuturo:any)=>null && "es lo que da ahora";
            it("calcula un registro vacío e inhabilitado", async function(){
                //@ts-expect-error v4 no debería ser undefined, sin embargo el validator lo tiene que tomar como null
                var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:undefined}
                var state = await rowValidator(simpleStruct, rowVacia);
                discrepances.showAndThrow(
                    state,
                    {
                        resumen:'vacio',
                        feedback:{
                            v1:{estado:'actual'    , siguiente:'v2', conDato:false, conProblema:false, pendiente:true ,apagada:false,inhabilitada:false,},
                            v2:{estado:'todavia_no', siguiente:'v3', conDato:false, conProblema:false, pendiente:false,apagada:false,inhabilitada:true ,},
                            v3:{estado:'todavia_no', siguiente:'v4', conDato:false, conProblema:false, pendiente:false,apagada:false,inhabilitada:true ,},
                            v4:{estado:'todavia_no', siguiente:null, conDato:false, conProblema:false, pendiente:null ,apagada:false,inhabilitada:false,},
                        },
                        feedbackResumen:{estado:'todavia_no', conDato:false, conProblema:false, pendiente:true},
                        estados:{v1:'actual', v2:'todavia_no', v3:'todavia_no', v4:'todavia_no'},
                        siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                        actual:'v1',
                        primeraVacia:'v1',
                        primeraFalla:null,
                    }
                )
            })
            it("calcula una variable omitida habilitada", async function(){
                var row:SimpleRow = {v1:'1', v2:null, v3:1, v4:null}
                var state = await rowValidator(simpleStruct, row);
                discrepances.showAndThrow(
                    state,
                    {
                        resumen:'con problemas',
                        feedback:{
                            v1:{estado:'valida'                    , siguiente:'v2', conDato:true , conProblema:false, pendiente:false,apagada:false,inhabilitada:false,},
                            v2:{estado:'omitida'                   , siguiente:'v3', conDato:false, conProblema:false, pendiente:true ,apagada:false,inhabilitada:false,},
                            v3:{estado:'fuera_de_flujo_por_omitida', siguiente:'v4', conDato:true , conProblema:true , pendiente:null ,apagada:false,inhabilitada:false,},
                            v4:{estado:'fuera_de_flujo_por_omitida', siguiente:null, conDato:false, conProblema:true , pendiente:null ,apagada:false,inhabilitada:false,},
                        },
                        feedbackResumen:{estado:'fuera_de_flujo_por_omitida', conDato:true, conProblema:true, pendiente:true},
                        estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                        siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                        actual:'v2',
                        primeraVacia:'v2',
                        primeraFalla:'v2',
                    }
                )
            })
            it("calcula dos variables omitidas inhabilitadas", async function(){
                var row:SimpleRow = {v1:'1', v2:null, v3:null, v4:'B'}
                var state = await rowValidator(simpleStruct, row);
                discrepances.showAndThrow(
                    state,
                    {
                        resumen:'con problemas',
                        feedback:{
                            v1:{estado:'valida'                    , siguiente:'v2', conDato:true , conProblema:false, pendiente:false,apagada:false,inhabilitada:false,},
                            v2:{estado:'omitida'                   , siguiente:'v3', conDato:false, conProblema:false, pendiente:true ,apagada:false,inhabilitada:false,},
                            v3:{estado:'fuera_de_flujo_por_omitida', siguiente:'v4', conDato:false, conProblema:false, pendiente:null ,apagada:false,inhabilitada:false,},
                            v4:{estado:'fuera_de_flujo_por_omitida', siguiente:null, conDato:true , conProblema:true , pendiente:null ,apagada:false,inhabilitada:false,},
                        },
                        feedbackResumen:{estado:'fuera_de_flujo_por_omitida', conDato:true, conProblema:true, pendiente:true ,},
                        estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                        siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                        actual:'v2',
                        primeraVacia:'v2',
                        primeraFalla:'v2',
                    }
                )
            })
            it("salto inhabilitado", async function(){
                var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
                var state = await rowValidator(simpleStruct, row);
                discrepances.showAndThrow(
                    state,
                    {
                        resumen:'con problemas',
                        feedback:{
                            v1:{estado:'valida'                  , siguiente:'v4', conDato:true , conProblema:false, pendiente:false,apagada:false,inhabilitada:false,},
                            v2:{estado:'fuera_de_flujo_por_salto', siguiente:null, conDato:true , conProblema:true , pendiente:false,apagada:false,inhabilitada:true ,},
                            v3:{estado:'salteada'                , siguiente:null, conDato:false, conProblema:false, pendiente:false,apagada:false,inhabilitada:true ,},
                            v4:{estado:'actual'                  , siguiente:null, conDato:false, conProblema:false, pendiente:true ,apagada:false,inhabilitada:false,},
                        },
                        feedbackResumen:{estado:'fuera_de_flujo_por_salto', conDato:true, conProblema:true, pendiente:true},
                        estados:{v1:'valida', v2:'fuera_de_flujo_por_salto', v3:'salteada', v4:'actual'},
                        siguientes:{v1:'v4', v2:NULL('v4'), v3:NULL('v4'), v4:null},
                        actual:'v4',
                        primeraVacia:'v4',
                        primeraFalla:'v2',
                    }
                )
            })
            it("una salteada está marcada", async function(){
                var row:SimpleRow = {v1:'A', v2:null, v3:1, v4:null}
                var state = await rowValidator(simpleStruct, row);
                discrepances.showAndThrow(
                    state,
                    {
                        resumen:'con problemas',
                        feedback:{
                            v1:{estado:'valida'                  , siguiente:'v4', conDato:true , conProblema:false, pendiente:false,apagada:false,inhabilitada:false,},
                            v2:{estado:'salteada'                , siguiente:null, conDato:false, conProblema:false, pendiente:false,apagada:false,inhabilitada:true ,},
                            v3:{estado:'fuera_de_flujo_por_salto', siguiente:null, conDato:true , conProblema:true , pendiente:false,apagada:false,inhabilitada:true ,},
                            v4:{estado:'actual'                  , siguiente:null, conDato:false, conProblema:false, pendiente:true ,apagada:false,inhabilitada:false,},
                        },
                        feedbackResumen:{estado:'fuera_de_flujo_por_salto', conDato:true, conProblema:true, pendiente:true},
                         estados:{v1:'valida', v2:'salteada', v3:'fuera_de_flujo_por_salto', v4:'actual'},
                        siguientes:{v1:'v4', v2:NULL('v4'), v3:NULL('v4'), v4:null},
                        actual:'v4',
                        primeraVacia:'v4',
                        primeraFalla:'v3',
                    }
                )
            })
        })
    });
    describe("saltos al final", async function(){
        var calculadasIntermedias:Structure<keyof DesordenRow, 'FIN'>={
            marcaFin:'FIN',
            variables:{
                v9:{tipo:'numerico'},
                v1:{tipo:'texto', optativa:true, calculada:true},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}, 3:{salto:'FIN'}}},
                v3:{tipo:'numerico', salto:'FIN'},
                v4:{tipo:'texto', calculada:true},
                v11:{tipo:'numerico'},
            }
        }
        it("desde opción va al final", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:3, v3:null, v4:null, v11:null}
            var state = await rowValidator(calculadasIntermedias, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v9:'valida', v1:'calculada', v2:'valida', v3:'salteada', v4:'calculada', v11:'salteada'},
                    siguientes:{v9:'v2', v1:null, v2:'FIN', v3:'FIN', v4:null, v11:'FIN'},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("incondicionalmente va al final", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:4, v4:null, v11:null}
            var state = await rowValidator(calculadasIntermedias, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v9:'valida', v1:'calculada', v2:'valida', v3:'valida', v4:'calculada', v11:'salteada'},
                    siguientes:{v9:'v2', v1:null, v2:'v3', v3:'FIN', v4:null, v11:'FIN'},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("incondicionalmente va al final con nsnc", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:-9, v4:null, v11:null}
            var state = await rowValidator(calculadasIntermedias, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v9:'valida', v1:'calculada', v2:'valida', v3:'valida', v4:'calculada', v11:'salteada'},
                    siguientes:{v9:'v2', v1:null, v2:'v3', v3:'FIN', v4:null, v11:'FIN'},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
    });
    describe("variables optativas", async function(){
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
                v3:{tipo:'opciones', opciones:{1:{salto:'v11'}, 2:{}}, optativa:true, salto:true},
                v4:{tipo:'texto'},
                v11:{tipo:'numerico'}
            }
        }
        it("calcula un registro vacío", async function(){
            var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:null}
            var state = await rowValidator(la1OptativaStruct, rowVacia);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'vacio',
                    estados:{v1:'optativa_sd', v2:'actual', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("calcula una variable omitida", async function(){
            var row:SimpleRow = {v1:null, v2:null, v3:1, v4:null}
            var state = await rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'optativa_sd', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v1',
                    primeraFalla:'v2',
                }
            )
        })
        it("marca un salto", async function(){
            var row:SimpleRow = {v1:null, v2:1, v3:null, v4:null}
            var state = await rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v1:'optativa_sd', v2:'valida', v3:'salteada', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("optativa presente", async function(){
            var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
            var state = await rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v4',
                    primeraFalla:null,
                }
            )
        })
        it("una salteada está marcada", async function(){
            var row:SimpleRow = {v1:null, v2:1, v3:1, v4:null}
            var state = await rowValidator(la1OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'optativa_sd', v2:'valida', v3:'fuera_de_flujo_por_salto', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v1',
                    primeraFalla:'v3',
                }
            )
        })
        it("salto en opción con incondicional", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:1, v4:null, v11:null}
            var state = await rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'valida', v4:'salteada', v11:'actual'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:'v11', v4:'v11', v11:null},
                    actual:'v11',
                    primeraVacia:'v11',
                    primeraFalla:null,
                }
            )
        })
        it("optativa con salto", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:null, v4:null, v11:null}
            var state = await rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'optativa_sd', v4:'salteada', v11:'salteada'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:true, v4:true, v11:true},
                    actual:null,
                    primeraVacia:'v3',
                    primeraFalla:null,
                }
            )
        })
        it("nsnr con salto", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:-9, v3:null, v4:null, v11:null}
            var state = await rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'salteada', v4:'salteada', v11:'actual'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v11', v3:'v11', v4:'v11', v11:null},
                    actual:'v11',
                    primeraVacia:'v11',
                    primeraFalla:null,
                }
            )
        })
        it("nsnr sin salto", async function(){
            var row:DesordenRow = {v9:-1, v1:'A', v2:2, v3:2, v4:null, v11:null}
            var state = await rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'valida', v4:'salteada', v11:'salteada'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:true, v4:true, v11:true},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("nsnr sin salto especial con salto incondicional", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:2, v3:-9, v4:null, v11:null}
            var state = await rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'valida', v4:'salteada', v11:'salteada'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v3', v3:true, v4:true, v11:true},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("nsnr -1 con salto", async function(){
            var row:DesordenRow = {v9:1, v1:'A', v2:-1, v3:null, v4:null, v11:null}
            var state = await rowValidator(la3OptativaStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v9:'valida', v1:'valida', v2:'valida', v3:'salteada', v4:'salteada', v11:'actual'},
                    siguientes:{v9:'v1', v1:'v2', v2:'v11', v3:'v11', v4:'v11', v11:null},
                    actual:'v11',
                    primeraVacia:'v11',
                    primeraFalla:null,
                }
            )
        })
    })
    describe('libre', function(){
        var rowValidator = getRowValidatorSinMultiestado();
        var simpleStruct:Structure<keyof SimpleRow>={
            variables:{
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico', minimo:0, maximo:98, libre:true},
                v4:{tipo:'texto'}
            }
        }
        it("calcula un registro vacío con libre", async function(){
            var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:null}
            var state = await rowValidator(simpleStruct, rowVacia);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'vacio',
                    estados:{v1:'actual', v2:'todavia_no', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v1',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("calcula un registro cuasi vacío con libre", async function(){
            var rowVacia:SimpleRow = {v1:null, v2:null, v3:3, v4:null}
            var state = await rowValidator(simpleStruct, rowVacia);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'vacio',
                    estados:{v1:'actual', v2:'todavia_no', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v1',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("calcula una variable libre con omitida", async function(){
            var row:SimpleRow = {v1:'A', v2:null, v3:1, v4:'B'}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v2',
                    primeraFalla:'v2',
                }
            )
        })
        it("calcula una variable libre futura", async function(){
            var row:SimpleRow = {v1:'A', v2:null, v3:1, v4:null}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v1:'valida', v2:'actual', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v2',
                    primeraFalla:null,
                }
            )
        })
        it("calcula una variable libre actual", async function(){
            var row:SimpleRow = {v1:'A', v2:2, v3:null, v4:null}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v1:'valida', v2:'valida', v3:'actual', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v3',
                    primeraVacia:'v3',
                    primeraFalla:null,
                }
            )
        })
        it("marca un salto", async function(){
            var row:SimpleRow = {v1:'A', v2:1, v3:null, v4:null}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'incompleto',
                    estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'actual'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:'v4',
                    primeraVacia:'v4',
                    primeraFalla:null,
                }
            )
        })
        it("una salteada libre está marcada", async function(){
            var row:SimpleRow = {v1:'A', v2:1, v3:1, v4:'B'}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v1:'valida', v2:'valida', v3:'salteada', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v4', v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:null,
                }
            )
        })
        it("falta una libre no optativa", async function(){
            var row:SimpleRow = {v1:'A', v2:2, v3:null, v4:'B'}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'valida', v3:'omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v3',
                    primeraFalla:'v3',
                    primeraVacia:'v3'
                }
            )
        })
    });
    describe('libre optativa', function(){
        var rowValidator = getRowValidatorSinMultiestado();
        var simpleStruct:Structure<keyof SimpleRow>={
            variables:{
                v1:{tipo:'texto'},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico', minimo:0, maximo:98, libre:true, optativa:true},
                v4:{tipo:'texto'}
            }
        }
        it("falta una libre optativa", async function(){
            var row:SimpleRow = {v1:'A', v2:2, v3:null, v4:'B'}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'ok',
                    estados:{v1:'valida', v2:'valida', v3:'optativa_sd', v4:'valida'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:null,
                    primeraFalla:null,
                    primeraVacia:'v3'
                }
            )
        })
    });
    describe('libre la primera', function(){
        var rowValidator = getRowValidatorSinMultiestado();
        var simpleStruct:Structure<keyof SimpleRow>={
            variables:{
                v1:{tipo:'texto', libre:true},
                v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}}},
                v3:{tipo:'numerico', minimo:0, maximo:98},
                v4:{tipo:'texto'}
            }
        }
        it("calcula un registro vacío con libre", async function(){
            var rowVacia:SimpleRow = {v1:null, v2:null, v3:null, v4:null}
            var state = await rowValidator(simpleStruct, rowVacia);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'vacio',
                    estados:{v1:'actual', v2:'todavia_no', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v1',
                    primeraVacia:'v1',
                    primeraFalla:null,
                }
            )
        })
        it("calcula un registro cuasi vacío con libre", async function(){
            var rowVacia:SimpleRow = {v1:'a', v2:null, v3:null, v4:null}
            var state = await rowValidator(simpleStruct, rowVacia);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'vacio',
                    estados:{v1:'valida', v2:'actual', v3:'todavia_no', v4:'todavia_no'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v2',
                    primeraFalla:null,
                }
            )
        })
        it("calcula una variable libre con omitida", async function(){
            var row:SimpleRow = {v1:'A', v2:null, v3:1, v4:'B'}
            var state = await rowValidator(simpleStruct, row);
            discrepances.showAndThrow(
                state,
                {
                    resumen:'con problemas',
                    estados:{v1:'valida', v2:'omitida', v3:'fuera_de_flujo_por_omitida', v4:'fuera_de_flujo_por_omitida'},
                    siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                    actual:'v2',
                    primeraVacia:'v2',
                    primeraFalla:'v2',
                }
            )
        })
    });
});

describe('row-validator setup', async function(){
    var rowValidator = getRowValidator({multiEstado:false});
    var simpleRow:Structure<string>={
        variables:{
            v1:{tipo:'texto', funcionHabilitar:'inexistente'},
        }
    }
    it("calcula un registro vacío", async function(){
        try{
            await rowValidator(simpleRow, {v1:null});
            throw new Error('debia fallar');
        }catch(err){
            discrepances.showAndThrow(err,new Error('rowValidator error. No existe la funcion habilitadora inexistente'));
        }
    })
    it("tipo opciones sin opciones", async function(){
        try{
            await rowValidator({variables:{v1:{tipo:'opciones'}}}, {v1:1});
            throw new Error('debia fallar');
        }catch(err){
            discrepances.showAndThrow(err,new Error("rowValidator error. Variable \"v1\" sin opciones"));
        }
    })
});

describe('con filtros', function(){
    let estructura:Structure<string> = {
        variables:{
            nombre:  { tipo: 'texto' },
            sexo:    { tipo: 'opciones', opciones:{1:{}, 2:{}}},
            edad:    { tipo: 'numero' },
            filtro1: { tipo: 'filtro' , funcionHabilitar:'sexo == 2 and edad >= 14', salto:'salario'},
            hijos:   { tipo: 'numero' },
            salario: { tipo: 'numero '}
        }
    }
    let estructura2:Structure<string> = {
        variables:{
            nombre:  { tipo: 'texto' },
            sexo:    { tipo: 'opciones', opciones:{1:{}, 2:{}}},
            edad:    { tipo: 'numero' },
            autoresp:{ tipo: 'opciones', opciones:{1:{}, 2:{salto:true}}}, // si no es autorespondente fin de cuestionario
            filtro1: { tipo: 'filtro' , funcionHabilitar:'sexo == 2 and edad >= 14', salto:'salario'},
            hijos:   { tipo: 'numero' },
            salario: { tipo: 'numero '}
        }
    }
    let rowValidator = getRowValidator({
        getFuncionHabilitar(name:string){
            var tablaFunciones: {[exp in string]: (row:{[x in string]:any})=>boolean } = {
                'sexo == 2 and edad >= 14': function(row){ return row.sexo == 2 && row.edad >= 14; }
            };
            return tablaFunciones[name];
        }
    })
    it("row vacío", ()=>{
        let row = { nombre:null, sexo:null, edad:null, hijos:null, salario:null };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura, row);
        discrepances.showAndThrow(
            obtained,
            {
                resumen:'vacio',
                estados:{ nombre:'actual', sexo:'todavia_no', edad:'todavia_no', filtro1:'todavia_no', hijos:'todavia_no', salario:'todavia_no' },
                siguientes:{ nombre:'sexo', sexo:'edad', edad:'hijos', filtro1:null /* preferimos 'hijos'*/, hijos:'salario', salario:null },
                actual:'nombre',
                primeraVacia:'nombre',
                primeraFalla:null,
            }
        )
    })
    it("row llena mujer adulta", ()=>{
        let row = { nombre:'Adela', sexo:2, edad:22, hijos:1, salario:50000 };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura, row);
        discrepances.showAndThrow(
            obtained,
            {
                resumen:'ok',
                estados:{ nombre:'valida', sexo:'valida', edad:'valida', filtro1:'valida', hijos:'valida', salario:'valida' },
                siguientes:{ nombre:'sexo', sexo:'edad', edad:'hijos', filtro1:null /* preferimos 'hijos'*/, hijos:'salario', salario:null },
                actual:null,
                primeraFalla:null,
            }
        )
    })
    it("row llena mujer adulta no informa hijos", ()=>{
        let row = { nombre:'Adela', sexo:2, edad:22, hijos:null, salario:50000 };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura, row);
        let expected: typeof obtained = {
            resumen:'con problemas',
            estados:{ nombre:'valida', sexo:'valida', edad:'valida', filtro1:'valida', hijos:'omitida', salario:'fuera_de_flujo_por_omitida' },
            siguientes:{ nombre:'sexo', sexo:'edad', edad:'hijos', filtro1:null /* preferimos 'hijos'*/, hijos:'salario', salario:null },
            actual:'hijos',
            primeraVacia:'hijos',
            primeraFalla:'hijos',
        }
        assert.deepEqual(obtained, expected);
        discrepances.showAndThrow(
            obtained,
            expected
        )
    })
    it("row llena mujer adulta sin hijos", ()=>{
        let row = { nombre:'Adela', sexo:2, edad:22, hijos:0, salario:50000 };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura, row);
        let expected: typeof obtained = {
            resumen:'ok',
            estados:{ nombre:'valida', sexo:'valida', edad:'valida', filtro1:'valida', hijos:'valida', salario:'valida' },
            siguientes:{ nombre:'sexo', sexo:'edad', edad:'hijos', filtro1:null /* preferimos 'hijos'*/, hijos:'salario', salario:null },
            actual:null,
            primeraFalla:null,
        }
        assert.deepEqual(obtained, expected);
        discrepances.showAndThrow(
            obtained,
            expected
        )
    })
    it("row hombre incompleto", ()=>{
        let row = { nombre:'Abelardo', sexo:1, edad:22, hijos:null, salario:null };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura, row);
        let expected: typeof obtained = {
            resumen:'incompleto',
            estados:{ nombre:'valida', sexo:'valida', edad:'valida', filtro1:'salteada', hijos:'salteada', salario:'actual' },
            siguientes:{ nombre:'sexo', sexo:'edad', edad:'salario', filtro1:'salario', hijos:'salario', salario:null },
            actual:'salario',
            primeraVacia:'salario',
            primeraFalla:null,
        };
        assert.deepEqual(obtained, expected);
        discrepances.showAndThrow(
            obtained,
            expected  
        )
    })
    it("row mujer menor con hijos", ()=>{
        let row = { nombre:'Abelardo', sexo:2, edad:12, hijos:1, salario:null };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura, row);
        let expected: typeof obtained = {
            resumen:'con problemas',
            estados:{ nombre:'valida', sexo:'valida', edad:'valida', filtro1:'salteada', hijos:'fuera_de_flujo_por_salto', salario:'actual' },
            siguientes:{ nombre:'sexo', sexo:'edad', edad:'salario', filtro1:'salario', hijos:'salario', salario:null },
            actual:'salario',
            primeraVacia:'salario',
            primeraFalla:'hijos',
        };
        assert.deepEqual(obtained, expected);
        discrepances.showAndThrow(
            obtained,
            expected  
        )
    })
    it("row salto el filtro", ()=>{
        let row = { nombre:'Aaron', sexo:1, edad:25, autoresp:2, hijos:null, salario:null };
        let {feedbackResumen, feedback, ...obtained} = rowValidator(estructura2, row);
        let expected: typeof obtained = {
            resumen:'ok',
            estados:{ nombre:'valida', sexo:'valida', edad:'valida', autoresp:'valida', filtro1:'salteada', hijos:'salteada', salario:'salteada' },
            siguientes:{ nombre:'sexo', sexo:'edad', edad:'autoresp', autoresp:true,  filtro1:true, hijos:true, salario:true },
            actual:null,
            primeraFalla:null,
        };
        assert.deepEqual(obtained, expected);
        discrepances.showAndThrow(
            obtained,
            expected  
        )
    })
});


describe('row-validator autoing', function(){
    var getFuncionValorar=(nombre:string)=>{
        switch(nombre){
            case 'v2=3,currDate':
                return (formData:RowData<string>) => formData.v2==3 ? bestGlobals.date.today() : null;
            default:
                throw new Error('no encontrado')
        }
    };
    var rowValidator = getRowValidatorSinMultiestado({
        getFuncionValorar
    });
    var simpleStruct:Structure<keyof SimpleRow>={
        variables:{
            v1:{tipo:'texto'},
            v2:{tipo:'opciones', opciones:{1:{salto:'v4'}, 2:{}, 3:{}}},
            v3:{tipo:'fecha', minimo:0, maximo:98, funcionAutoIngresar:'v2=3,currDate'},
            v4:{tipo:'texto'}
        }
    }
    it("sin auto ingreso, no se cumple la precondición", async function(){
        var row:SimpleRow = {v1:'ok', v2:2, v3:null, v4:null}
        var state = await rowValidator(simpleStruct, row, {autoIngreso:true});
        discrepances.showAndThrow(
            state,
            {
                resumen:'incompleto',
                estados:{v1:'valida', v2:'valida', v3:'actual', v4:'todavia_no'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v3',
                primeraVacia:'v3',
                primeraFalla:null,
                autoIngresadas:{}
            }
        )
        discrepances.showAndThrow(
            row,
            {v1:'ok', v2:2, v3:null, v4:null}
        )
    })
    it("con auto ingreso, es la actual", async function(){
        var hoy = bestGlobals.date.today();
        var row:DatedRow = {v1:'ok', v2:3, v3:null, v4:null}
        var state = await rowValidator(simpleStruct, row, {autoIngreso:true});
        discrepances.showAndThrow(
            state,
            {
                resumen:'incompleto',
                estados:{v1:'valida', v2:'valida', v3:'actual', v4:'todavia_no'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v3',
                primeraVacia:'v3',
                primeraFalla:null,
                autoIngresadas:{v3:hoy}
            }
        )
        discrepances.showAndThrow(
            row,
            {v1:'ok', v2:3, v3:null, v4:null}
        )
    })
    it("sin auto ingreso, es la actual pero no está la opción", async function(){
        var row:DatedRow = {v1:'ok', v2:2, v3:null, v4:null}
        var state = await rowValidator(simpleStruct, row);
        discrepances.showAndThrow(
            state,
            {
                resumen:'incompleto',
                estados:{v1:'valida', v2:'valida', v3:'actual', v4:'todavia_no'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v3',
                primeraVacia:'v3',
                primeraFalla:null
            }
        )
        discrepances.showAndThrow(
            row,
            {v1:'ok', v2:2, v3:null, v4:null}
        )
    })
    it("con auto ingreso, está omitida", async function(){
        var row:DatedRow = {v1:'ok', v2:2, v3:null, v4:'pasada'}
        var state = await rowValidator(simpleStruct, row, {autoIngreso:true});
        discrepances.showAndThrow(
            state,
            {
                resumen:'con problemas',
                estados:{v1:'valida', v2:'valida', v3:'omitida', v4:'fuera_de_flujo_por_omitida'},
                siguientes:{v1:'v2', v2:'v3', v3:'v4', v4:null},
                actual:'v3',
                primeraVacia:'v3',
                primeraFalla:'v3',
                autoIngresadas:{}
            }
        )
        discrepances.showAndThrow(
            row,
            {v1:'ok', v2:2, v3:null, v4:'pasada'}
        )
    })
});
"use strict";

export type Valor = string | number | boolean | null

export interface Opcion<V>{
    salto?:V|null
}

export interface Variable<V, FH>{
    optativa?:boolean
    salto?:V|null
    tipo:'opciones'|'numerico'|'texto'|string
    opciones?:{[k in string|number]:Opcion<V>}
    maximo?:number|null
    minimo?:number|null
    subordinadaVar?:V|null
    subordinadaValor?:Valor|null
    saltoNsNr?:V|null
    calculada?:boolean|null
    funcionHabilitar?:FH|null
}

export interface Structure<V extends string, FH extends string = string>{
    variables:{
        [k in V]:Variable<V, FH>
    }
}
export type RowData<V extends string> = {
    [k in V]: any
}

export type FormStructureState = {
    estados:{[key:string]:string}
    siguientes?:any
    actual?:any
    primeraVacia?:any
    primeraFalla?:any
};

export interface RowValidatorSetup {
    getFuncionHabilitar?:(name:string)=>((formData:RowData<string>)=>boolean)
}

export function getRowValidator(setup:RowValidatorSetup){
    setup.getFuncionHabilitar=setup.getFuncionHabilitar||(
        (nombre:string)=>{
            throw new Error('rowValidator error. No existe la funcion habilitadora '+nombre);
        }
    );
    return function rowValidator<V extends string>(estructura:Structure<V>, formData:RowData<V>){
        var rta:FormStructureState={estados:{}, siguientes:{}, actual:null, primeraFalla:null};
        var variableAnterior=null;
        var yaPasoLaActual=false;  // si ya vi la variable "actual"
        var enSaltoAVariable=null; // null si no estoy saltando y el destino del salto si estoy dentro de un salto. 
        var conOmitida=false;  // para poner naranja
        var miVariable:V; // variable actual del ciclo
        var falla=function(estado:string){
            rta.estados[miVariable]=estado;
            if(!rta.primeraFalla){
                rta.primeraFalla=miVariable;
            }
        };
        for(miVariable in estructura.variables){
            let apagada:boolean=false;
            var revisar_saltos_especiales= false;
            var valor=formData[miVariable];
            const estructuraVar = estructura.variables[miVariable];
            if(estructuraVar.calculada){
                apagada=true;
                rta.estados[miVariable]='calculada';
            }else if(conOmitida){
                falla('fuera_de_flujo_por_omitida');
            }else if(enSaltoAVariable && miVariable!=enSaltoAVariable){
                apagada=true;
                // estoy dentro de un salto válido, no debería haber datos ingresados.
                if(valor===null){
                    rta.estados[miVariable]='salteada';
                }else{
                    falla('fuera_de_flujo_por_salto');
                }
            }else if(yaPasoLaActual){
                if(valor===null){
                    rta.estados[miVariable]='todavia_no';
                }else{
                    conOmitida=true;
                    if(!rta.primeraFalla){
                        rta.primeraFalla=rta.actual;
                    }
                    falla('fuera_de_flujo_por_omitida');
                }
            }else if(
                /* caso 1 */
                estructuraVar.subordinadaVar!=null 
                    && formData[estructuraVar.subordinadaVar]!=estructuraVar.subordinadaValor 
                || /* caso 2*/
                estructuraVar.funcionHabilitar 
                    && !setup.getFuncionHabilitar!(estructuraVar.funcionHabilitar)(formData)
            ){  // la variable está inhabilitada ya sea por:
                //   1) está subordinada y no es el valor que la activa
                //   2) la expresión habilitar falla
                apagada=true;
                if(valor===null){
                    rta.estados[miVariable]='salteada';
                }else{
                    falla('fuera_de_flujo_por_salto');
                }
            }else{
                // no estoy en una variable salteada y estoy dentro del flujo normal (no hubo omitidas hasta ahora). 
                enSaltoAVariable=null; // si estaba en un salto acá se acaba
                if(valor===null){
                    if(!rta.primeraVacia){
                        rta.primeraVacia=miVariable;
                    }
                    if(!estructuraVar.optativa){
                        rta.estados[miVariable]='actual';
                        rta.actual=miVariable;
                        yaPasoLaActual=miVariable!==null;
                    }else{
                        rta.estados[miVariable]='optativa_sd';
                        if(estructuraVar.salto){
                            enSaltoAVariable=estructuraVar.salto;
                        }
                    }
                }else if(valor==-9){
                    rta.estados[miVariable]='valida';
                    if(estructuraVar.saltoNsNr){
                        enSaltoAVariable=estructuraVar.saltoNsNr;
                    }
                    revisar_saltos_especiales=true;
                }else{
                    // hay algo ingresado hay que validarlo
                    if(estructuraVar.tipo=='opciones'){
                        if(estructuraVar.opciones==null){
                            throw new Error('rowValidator error. Variable "'+miVariable+'" sin opciones')
                        }
                        if(estructuraVar.opciones[valor]){
                            rta.estados[miVariable]='valida'; 
                            if(estructuraVar.opciones[valor].salto){
                                enSaltoAVariable=estructuraVar.opciones[valor].salto;
                            }
                        }else{
                            falla('invalida'); 
                        }
                    }else if(estructuraVar.tipo=='numerico'){
                        valor=Number(valor);
                        if(estructuraVar.maximo && valor > estructuraVar.maximo
                            || estructuraVar.minimo != null && valor < estructuraVar.minimo){
                            falla('fuera_de_rango'); 
                        }else{
                            rta.estados[miVariable]='valida'; 
                        }
                    }else{
                        // las de texto o de ingreso libre son válidas si no se invalidaron antes por problemas de flujo
                        rta.estados[miVariable]='valida'; 
                    }
                    if(estructuraVar.salto){
                        enSaltoAVariable=estructuraVar.salto;
                    }
                    revisar_saltos_especiales=true;
                }
                if (revisar_saltos_especiales){
                }    
            }
            if(rta.estados[miVariable]==null){
                /* istanbul ignore next */
                throw new Error('No se pudo validar la variable '+miVariable);
            }
            if(!apagada){
                if(variableAnterior && !rta.siguientes[variableAnterior]){
                    rta.siguientes[variableAnterior]=miVariable;
                }
                variableAnterior=miVariable;
            }
            rta.siguientes[miVariable]=enSaltoAVariable; // es null si no hay salto (o sea sigue con la próxima o es la última)
        }
        if(conOmitida){
            // @ts-expect-error recorro un objeto plano
            for(miVariable in rta.estados){
                if(rta.estados[miVariable]=='actual'){
                    rta.estados[miVariable]='omitida';
                }else if(rta.estados[miVariable]=='todavia_no'){
                    rta.estados[miVariable]='fuera_de_flujo_por_omitida';
                }else if(rta.estados[miVariable]=='fuera_de_flujo_por_omitida'){
                    break;
                }
            }
        }
        return rta;
    }
}
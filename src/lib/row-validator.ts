"use strict";

export interface Opcion<V>{
    salto?:V|null         // Destino del salto para la opción seleccionada
}

export type RowData<V extends string, D> = Record<V, D>

export type FuncionHabilitar<V extends string, D> = (formData: RowData<V, D>) => boolean
export type FuncionValoradora<V extends string, D> = (formData: RowData<V, D>) => D | null

export interface Variable<V extends string, D, FIN>{
    optativa?:boolean     // Obligatoriedad el ingreso de la variable
    salto?:V|FIN|null     // Destino del salto en caso de saltos icondicionales
    tipo:'opciones'|'numerico'|'texto'|string
    opciones?:Record<string|number, Opcion<V|FIN>>
    maximo?:number|null   // Máximo valor válido
    minimo?:number|null   // Míximo valor válido
    // Para variables de especifique dependientes de una opción:
        subordinadaVar?:V|null           // variable de la que depende
        subordinadaValor?:D|null         // valor que la activa
    saltoNsNr?:V|FIN|null       // Salto en el caso de no respuesta o NS/NC
    calculada?:boolean|null     // Si la variable es calculada (no ingresada)
    funcionHabilitar?:FuncionHabilitar<V,D>|string|null   // Determina la habilitación dinámica
    libre?:boolean|null         // Posibilidad de ingresarla aunque esté salteada
    funcionAutoIngresar?:FuncionValoradora<V,D>|string|null // Determina un cálculo para el valor inicial de una variable que se muestra al ser actual
}

export interface Structure<V extends string, D, FIN = true>{
    variables:Record<V, Variable<V, D, FIN>>
    marcaFin?:FIN
}

export type EstadoVariableNormales = 'actual'|'valida'|'todavia_no'|'calculada'|'salteada'|'optativa_sd'
export type EstadoVariableErroneas = 'invalida'|'omitida'|'fuera_de_rango'|'fuera_de_flujo_por_omitida'|'fuera_de_flujo_por_salto'
export type EstadoVariable = EstadoVariableNormales | EstadoVariableErroneas

export type Feedback<V extends string, FIN>={
    estado:EstadoVariable
    siguiente:V|FIN|null|undefined
    apagada:boolean
    inhabilitada:boolean
    conDato:boolean
    conProblema:boolean
    pendiente:boolean|null
}

export type FormStructureState<V extends string, D, FIN> = {
    resumen:'vacio'|'con problemas'|'incompleto'|'ok'
    feedbackResumen:Omit<Feedback<V,FIN>,'siguiente'|'apagada'|'inhabilitada'>
    feedback:Record<V, Feedback<V,FIN>>
    estados:Partial<Record<V, EstadoVariable>>
    siguientes:Partial<Record<V, V|FIN|null>>
    actual:V|null
    primeraVacia?:V|null
    primeraFalla:V|null
    autoIngresadas?:Partial<RowData<V,D>>
};

export interface RowValidatorSetup<V extends string, D>{ // TODO PARAMETRIZR LOS TIPOS
    getFuncionHabilitar: (name:string) => FuncionHabilitar<V, D>
    getFuncionValorar: (name:string) => FuncionValoradora<V, D>
    nsnrTipicos:Record<string, boolean>
    multiEstado:boolean|null
}

export type OpcionesRowValidator={
    autoIngreso?: boolean
}

export function getRowValidator<V extends string, D, FIN>(_setup:Partial<RowValidatorSetup<V, D>>){
    var setup:RowValidatorSetup<V, D>={
        getFuncionHabilitar:(nombre:string)=>{
            throw new Error('rowValidator error. No existe la funcion habilitadora '+nombre);
        },
        getFuncionValorar:(nombre:string)=>{
            throw new Error('rowValidator error. No existe la funcion valoradora '+nombre);
        },
        nsnrTipicos:{
            "-1":true,
            "-9":true,
        },
        multiEstado:null,
        ..._setup
    };
    return function rowValidator(estructura:Structure<V, D, FIN>, formData:RowData<V, D>, opts?:OpcionesRowValidator){
        let getFuncionHabilitar = (nameOrFun: null | undefined | string | FuncionHabilitar<V,D>) => 
            nameOrFun == null ? ()=>true :
            nameOrFun instanceof Function ? nameOrFun : setup.getFuncionHabilitar(nameOrFun);
        let getFuncionValorar = (nameOrFun: null | undefined | string | FuncionValoradora<V,D>) => 
            nameOrFun == null ? ()=>null :
            nameOrFun instanceof Function ? nameOrFun : setup.getFuncionValorar(nameOrFun);
        var rta:FormStructureState<V, D, FIN>={
            feedback:{} as FormStructureState<V, D, FIN>['feedback'], 
            feedbackResumen:{} as Feedback<V,FIN>, 
            estados:{}, 
            siguientes:{}, 
            actual:null, primeraFalla:null, resumen:'vacio'
        };
        if(opts?.autoIngreso){
            rta.autoIngresadas = {}
        }
        var respuestas=0;
        var libres=0;
        var problemas=0;        
        var variableAnterior=null;
        var yaPasoLaActual=false;  // si ya vi la variable "actual"
        var enSaltoAVariable=null; // null si no estoy saltando y el destino del salto si estoy dentro de un salto. 
        var conOmitida=false;  // para poner naranja
        var miVariable:V; // variable actual del ciclo
        var variableOrigenSalto:V|null = null;
        for(miVariable in estructura.variables){
            let apagada:boolean=false;
            const feedback={
                conProblema:false,
                inhabilitada:false,
                pendiente:null,
                apagada:false,
            } as Feedback<V,FIN>;
            var falla=function(estado:EstadoVariable){
                problemas++;
                feedback.conProblema=true;
                feedback.estado=estado;
                if(!rta.primeraFalla){
                    rta.primeraFalla=miVariable;
                }
            };
            var revisar_saltos_especiales=false;
            var valor=formData[miVariable];
            const estructuraVar = estructura.variables[miVariable];
            feedback.conDato=valor!=null;
            if(estructuraVar.calculada){
                apagada=true;
                feedback.estado='calculada';
            }else if(conOmitida){
                falla('fuera_de_flujo_por_omitida');
            }else if(enSaltoAVariable && miVariable!=enSaltoAVariable && (estructuraVar.subordinadaVar != variableOrigenSalto || estructuraVar.subordinadaValor != formData[variableOrigenSalto!])){
                apagada=true;
                // estoy dentro de un salto válido, no debería haber datos ingresados.
                if(valor == null || estructuraVar.libre){
                    feedback.estado='salteada';
                }else{
                    falla('fuera_de_flujo_por_salto');
                }
            }else if(yaPasoLaActual){
                if(valor == null || estructuraVar.libre){
                    feedback.estado='todavia_no';
                }else{
                    conOmitida=true;
                    if(!rta.primeraFalla){
                        rta.primeraFalla=rta.actual;
                    }
                    falla('fuera_de_flujo_por_omitida');
                    feedback.conProblema=feedback.conDato;
                }
            }else if(
                /* caso 1 */
                estructuraVar.subordinadaVar!=null 
                    && formData[estructuraVar.subordinadaVar]!=estructuraVar.subordinadaValor 
                || /* caso 2*/
                estructuraVar.tipo != 'filtro' 
                    && !getFuncionHabilitar(estructuraVar.funcionHabilitar)(formData)
            ){  // la variable está inhabilitada ya sea por:
                //   1) está subordinada y no es el valor que la activa
                //   2) la expresión habilitar falla
                apagada=true;
                if(valor == null){
                    feedback.estado='salteada';
                }else{
                    falla('fuera_de_flujo_por_salto');
                }
                feedback.inhabilitada=true;
            }else{
                // no estoy en una variable salteada y estoy dentro del flujo normal (no hubo omitidas hasta ahora). 
                enSaltoAVariable=null; // si estaba en un salto acá se acaba
                if(valor == null){
                    if(estructuraVar.tipo=='filtro'){
                        /* istanbul ignore if */
                        if(yaPasoLaActual){
                            feedback.estado='todavia_no';
                        }else{
                            // hay que calcular si el filtro salta
                            let habilitado = getFuncionHabilitar(estructuraVar.funcionHabilitar)(formData)
                            if(habilitado){
                                feedback.estado='valida';
                            }else{
                                enSaltoAVariable=estructuraVar.salto;
                                feedback.estado='salteada';
                                variableOrigenSalto = miVariable;
                            }
                        }
                    }else{
                        if(!rta.primeraVacia){
                            rta.primeraVacia=miVariable;
                        }
                        if(opts && opts.autoIngreso){
                            let nuevoValor = getFuncionValorar(estructuraVar.funcionAutoIngresar)(formData);
                            if(nuevoValor != null){
                                rta.autoIngresadas![miVariable] = nuevoValor;
                            }
                        }
                        if(!estructuraVar.optativa){
                            feedback.estado='actual';
                            feedback.pendiente=true;
                            rta.actual=miVariable;
                            yaPasoLaActual=miVariable!==null;
                        }else{
                            feedback.estado='optativa_sd';
                            if(estructuraVar.salto){
                                enSaltoAVariable=estructuraVar.salto;
                                variableOrigenSalto = miVariable;
                            }
                        }
                    }
                }else{
                    respuestas++;
                    if(estructuraVar.libre){
                        libres++;
                    }
                    // hay algo ingresado hay que validarlo
                    if(setup.nsnrTipicos[valor as unknown as string]){
                        feedback.estado='valida';
                        if(estructuraVar.saltoNsNr){
                            enSaltoAVariable=estructuraVar.saltoNsNr;
                            variableOrigenSalto = miVariable;
                        }
                        feedback.pendiente=false;
                    }else if(estructuraVar.tipo=='opciones'){
                        if(estructuraVar.opciones==null){
                            throw new Error('rowValidator error. Variable "'+miVariable+'" sin opciones')
                        }
                        if(estructuraVar.opciones[valor as unknown as string]){
                            feedback.estado='valida'; 
                            feedback.pendiente=false;
                            if(estructuraVar.opciones[valor as unknown as string].salto){
                                enSaltoAVariable=estructuraVar.opciones[valor as unknown as string].salto;
                                variableOrigenSalto = miVariable;
                            }
                        }else{
                            falla('invalida'); 
                        }
                    }else if(estructuraVar.tipo=='numerico'){
                        var valorNumerico = Number(valor)
                        // @ts-expect-error No hay manera (por ahora) de que sepa que este valor en particular es un número
                        valor=valorNumerico
                        if(estructuraVar.maximo !=null && valorNumerico > estructuraVar.maximo
                            || estructuraVar.minimo != null && valorNumerico < estructuraVar.minimo){
                            falla('fuera_de_rango'); 
                        }else{
                            feedback.estado='valida'; 
                            feedback.pendiente=false;
                        }
                    }else{
                        // las de texto o de ingreso libre son válidas si no se invalidaron antes por problemas de flujo
                        feedback.estado='valida'; 
                        feedback.pendiente=false;
                    }
                    if(enSaltoAVariable==null && estructuraVar.salto){
                        enSaltoAVariable=estructuraVar.salto;
                        variableOrigenSalto = miVariable;
                    }
                    revisar_saltos_especiales=true;
                }
                if (revisar_saltos_especiales){
                }    
            }
            /* istanbul ignore next */
            if(feedback.estado==null){
                throw new Error('No se pudo validar la variable '+miVariable);
            }
            if(apagada){
                feedback.pendiente=false;
            }else if(estructuraVar.tipo!='filtro'){
                if(variableAnterior && !rta.siguientes[variableAnterior]){
                    rta.feedback[variableAnterior].siguiente=miVariable;
                }
                variableAnterior=miVariable;
            }
            if(!estructuraVar.calculada){
                feedback.siguiente=enSaltoAVariable; // es null si no hay salto (o sea sigue con la próxima o es la última)
            }else{
                feedback.siguiente=null;
            }
            if(!feedback.inhabilitada && !getFuncionHabilitar!(estructuraVar.funcionHabilitar)(formData)){
                feedback.inhabilitada=true;
            }
            rta.feedback[miVariable]=feedback;
        }
        for(miVariable in estructura.variables){
            let feedback=rta.feedback[miVariable];
            if(conOmitida){
                if(feedback.estado=='actual'){
                    feedback.estado='omitida';
                }else if(feedback.estado=='todavia_no'){
                    feedback.estado='fuera_de_flujo_por_omitida';
                }
            }
            if(setup.multiEstado!==true){
                rta.estados[miVariable]=feedback.estado;
                rta.siguientes[miVariable]=feedback.siguiente;
            }
            if(feedback.estado=='todavia_no'){
                if(feedback.inhabilitada){
                    feedback.pendiente=false;
                }else{
                    feedback.pendiente=null;
                }
            }
            rta.feedbackResumen.estado = rta.feedbackResumen.conProblema?rta.feedbackResumen.estado:feedback.estado;
            rta.feedbackResumen.conDato = rta.feedbackResumen.conDato || feedback.conDato;
            rta.feedbackResumen.conProblema = rta.feedbackResumen.conProblema || feedback.conProblema;
            rta.feedbackResumen.pendiente = rta.feedbackResumen.pendiente || feedback.pendiente;
        }
        if(problemas){
            rta.resumen='con problemas';
        }else{
            if(rta.actual){
                if(respuestas>libres){
                    rta.resumen='incompleto';
                }else{
                    rta.resumen='vacio';
                }
            }else{
                rta.resumen='ok';
            }
        }
        if(setup.multiEstado===false){
            // @ts-ignore
            delete rta.feedbackResumen;
            // @ts-ignore
            delete rta.feedback;
        }
        return rta;
    }
}

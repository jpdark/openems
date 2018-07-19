import { DefaultTypes } from '../service/defaulttypes';
import { ConfigImpl } from './config';
import { Utils } from '../service/utils';
import { Edge } from './edge';
import { CurrentDataAndSummary } from './currentdata';

export class CurrentDataAndSummary_2018_8 extends CurrentDataAndSummary {
    constructor(private edge: Edge, data: DefaultTypes.Data, config: ConfigImpl) {
        super(data);
        this.summary = this.getSummary(data, config);
    }

    private getSummary(d: DefaultTypes.Data, config: ConfigImpl): DefaultTypes.Summary {
        let result: DefaultTypes.Summary = {
            storage: {
                soc: null,
                isAsymmetric: false,
                hasDC: false,
                chargeActivePower: null, // sum of chargeActivePowerAC and chargeActivePowerDC
                chargeActivePowerAC: null,
                chargeActivePowerACL1: null,
                chargeActivePowerACL2: null,
                chargeActivePowerACL3: null,
                chargeActivePowerDC: null,
                maxChargeActivePower: null,
                dischargeActivePower: null, // sum of dischargeActivePowerAC and dischargeActivePowerDC
                dischargeActivePowerAC: null,
                dischargeActivePowerACL1: null,
                dischargeActivePowerACL2: null,
                dischargeActivePowerACL3: null,
                dischargeActivePowerDC: null,
                maxDischargeActivePower: null
            }, production: {
                isAsymmetric: false,
                hasDC: false,
                powerRatio: null,
                activePower: null, // sum of activePowerAC and activePowerDC
                activePowerAC: null,
                activePowerACL1: null,
                activePowerACL2: null,
                activePowerACL3: null,
                activePowerDC: null,
                maxActivePower: null
            }, grid: {
                powerRatio: null,
                buyActivePower: null,
                maxBuyActivePower: null,
                sellActivePower: null,
                maxSellActivePower: null
            }, consumption: {
                powerRatio: null,
                activePower: null
            }
        };

        const sum = d['_sum'];
        {
            /*
             * Storage
             * > 0 => Discharge
             * < 0 => Charge
             */
            result.storage.soc = sum['EssSoc'];
            const essActivePower: number = sum['EssActivePower'];
            result.storage.chargeActivePowerAC = essActivePower < 0 ? essActivePower * -1 : 0;
            result.storage.chargeActivePower = result.storage.chargeActivePowerAC; // TODO
            result.storage.dischargeActivePowerAC = essActivePower > 0 ? essActivePower : 0;
            result.storage.dischargeActivePower = result.storage.dischargeActivePowerAC; // TODO
        }

        {
            /*
             * Grid
             * > 0 => Buy from grid
             * < 0 => Sell to grid
             */
            const gridActivePower: number = sum['GridActivePower'];
            result.grid.maxBuyActivePower = sum['GridMaxActivePower'];
            result.grid.maxSellActivePower = sum['GridMinActivePower'] * -1;
            if (gridActivePower > 0) {
                result.grid.sellActivePower = 0;
                result.grid.buyActivePower = gridActivePower;
                result.grid.powerRatio = Math.round(result.grid.buyActivePower / result.grid.maxBuyActivePower * 100);
            } else {
                result.grid.sellActivePower = gridActivePower * -1;
                result.grid.buyActivePower = 0;
                result.grid.powerRatio = Math.round(result.grid.buyActivePower / result.grid.maxSellActivePower * -100);
            }
        }

        {
            /*
             * Production
             */
            const productionActivePower: number = sum['ProductionActivePower'];
            result.production.activePowerAC = productionActivePower;
            result.production.activePower = result.production.activePowerAC; // TODO
            result.production.maxActivePower = sum['ProductionMaxActivePower'];
            result.production.powerRatio = Math.round(result.production.activePower / result.production.maxActivePower * 100);
        }

        {
            /*
             * Consumption
             */
            const consumptionActivePower: number = sum['ConsumptionActivePower'];
            result.consumption.activePower = consumptionActivePower;
            const consumptionMaxActivePower = sum['ConsumptionMaxActivePower'];
            result.consumption.powerRatio = Math.round(result.consumption.activePower / consumptionMaxActivePower * 100);
        }
        return result;
    }
}
import F1040 from '../../irsForms/F1040'
import StateForm from 'ustaxes/core/stateForms/Form'
import TC40 from './TC40'

export default (f1040: F1040): StateForm => new TC40(f1040)

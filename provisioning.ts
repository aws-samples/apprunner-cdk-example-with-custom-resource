import * as cdk from 'aws-cdk-lib'
import { AppRunnerStack } from './stack/apprunner'

const app = new cdk.App()
new AppRunnerStack(app, 'AppRunnerStack')

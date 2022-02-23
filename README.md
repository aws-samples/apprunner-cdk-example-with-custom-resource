# CDK Example of App Runner with CustomResource

```bash
## deploy
npx cdk deploy AppRunnerStack

## destory
npx cdk destory AppRunnerStack
```

## Why use CustomResource?

This is used it to cover a gap in CFN where we don't have a resource to create AppRunner AutoScalingConfiguration (AutoScalingConfigurationArn).

## Possible to set (VPC|CPU|Mem|AutoDeploy)?

Yes, please see [stack/apprunner.ts](./stack/apprunner.ts)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

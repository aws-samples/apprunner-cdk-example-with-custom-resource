import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as apprunner from 'aws-cdk-lib/aws-apprunner'
import * as assets from 'aws-cdk-lib/aws-ecr-assets'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cr from 'aws-cdk-lib/custom-resources'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as path from 'path'
import { CreateAutoScalingConfigurationCommandInput } from '@aws-sdk/client-apprunner'

export class AppRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const imageAsset = new assets.DockerImageAsset(this, 'ImageAssets', {
      directory: path.join(__dirname, '..', 'app')
    })

    const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com')
    })

    // * Set the IAM Policy that the container should assumes.
    // In this example, it's commented out because not necessary.
    // https://docs.aws.amazon.com/ja_jp/apprunner/latest/dg/security_iam_service-with-iam.html
    // instanceRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: ['dynamodb:*'],
    //     resources: ['*']
    //   })
    // )

    const accessRole = new iam.Role(this, 'AppRunnerBuildRole', {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com')
    })

    accessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:BatchGetImage',
          'ecr:DescribeImages',
          'ecr:GetAuthorizationToken',
          'ecr:GetDownloadUrlForLayer'
        ],
        resources: ['*']
      })
    )

    const autoScalingConfiguration: CreateAutoScalingConfigurationCommandInput = {
      AutoScalingConfigurationName: 'con100-min2-max25',
      MaxConcurrency: 100,
      MinSize: 2,
      MaxSize: 25
    }

    // * Two custom resources are defined to refer to the ARN when deleting.
    // https://github.com/aws/aws-cdk/issues/6985#issuecomment-603712539
    const createAutoScalingConfiguration = new cr.AwsCustomResource(this, 'CreateAutoScalingConfiguration', {
      onCreate: {
        service: 'AppRunner',
        action: 'createAutoScalingConfiguration',
        parameters: autoScalingConfiguration,
        physicalResourceId: cr.PhysicalResourceId.fromResponse('AutoScalingConfiguration.AutoScalingConfigurationArn')
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })

    const autoScalingConfigurationArn = createAutoScalingConfiguration.getResponseField(
      'AutoScalingConfiguration.AutoScalingConfigurationArn'
    )

    const deleteAutoScalingConfiguration = new cr.AwsCustomResource(this, 'DeleteAutoScalingConfiguration', {
      onDelete: {
        service: 'AppRunner',
        action: 'deleteAutoScalingConfiguration',
        parameters: {
          AutoScalingConfigurationArn: autoScalingConfigurationArn
        }
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })

    // * Set the environment variables to be used in the container
    const env = {
      AWS_REGION: this.region,
      AWS_ACCOUNT_ID: this.account
    }

    // * Enable if connect to VPC resources such as RDS.
    // const vpc = new ec2.Vpc(this, 'Vpc')
    // const sg = new ec2.SecurityGroup(this, 'AppRunnerSecurityGroup', { vpc })
    // const vpcConnector = new apprunner.CfnVpcConnector(this, 'VpcConnector', {
    //   subnets: vpc.privateSubnets.map((s) => s.subnetId),
    //   securityGroups: [sg.securityGroupId]
    // })

    const app = new apprunner.CfnService(this, 'AppRunner', {
      instanceConfiguration: {
        instanceRoleArn: instanceRole.roleArn,
        cpu: '2 vCPU',
        memory: '4 GB'
      },
      // * Enable if connect to VPC resources such as RDS.
      // networkConfiguration: {
      //   egressConfiguration: {
      //     egressType: 'VPC',
      //     vpcConnectorArn: vpcConnector.attrVpcConnectorArn
      //   }
      // },
      healthCheckConfiguration: {
        path: '/',
        protocol: 'HTTP'
      },
      autoScalingConfigurationArn: autoScalingConfigurationArn,
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn
        },
        autoDeploymentsEnabled: true,
        imageRepository: {
          imageIdentifier: imageAsset.imageUri,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '3000',
            runtimeEnvironmentVariables: Object.entries(env).map((e) => {
              return { name: e[0], value: e[1] }
            })
          }
        }
      }
    })

    new CfnOutput(this, 'AppRunnerUri', {
      value: `https://${app.attrServiceUrl}`
    })
  }
}

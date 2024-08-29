import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  ContainerImage,
  Secret as ecs_Secret,
} from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import {
  IApplicationLoadBalancer,
  ListenerAction,
  ListenerCondition,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ECSServiceProps {
  vpc: IVpc;
  dbSecret: ISecret;
  certificate: ICertificate;
  dbName: string;
  dbHostname: string;
  dbPort: string;
  applicationName: string;
  authorizedIPsForAdminAccess: string[];
  domainName: string;
  albDomainName: string;
  hostedZone: IHostedZone;
}

export class ECSService extends Construct {
  public readonly loadBalancer: IApplicationLoadBalancer;
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: ECSServiceProps) {
    super(scope, id);

    const {
      vpc,
      dbSecret,
      dbHostname,
      dbName,
      dbPort,
      certificate,
      applicationName,
      authorizedIPsForAdminAccess,
      domainName,
      albDomainName,
      hostedZone,
    } = props;

    const strapiSecret = new Secret(this, 'StrapiSecret', {
      secretName: `${applicationName}-strapi-secret`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'StrapiKey',
        excludePunctuation: true,
      },
    });

    // S3 Bucket
    const s3Bucket = new Bucket(this, 'StrapiBucket');

    // Create Docker Image Asset
    const dockerImageAsset = new DockerImageAsset(this, 'DockerImageAsset', {
      directory: '../cms',
      platform: Platform.LINUX_AMD64,
      file: 'Dockerfile.prod',
      buildArgs: {
        NODE_ENV: 'production',
      },
    });

    const cluster = new Cluster(this, 'Cluster', { vpc });
    const loadBalancedService = new ApplicationLoadBalancedFargateService(
      this,
      'FargateService',
      {
        cluster,
        taskImageOptions: {
          secrets: {
            ...this.getSecretsDefinition(dbSecret, strapiSecret),
          },
          image: ContainerImage.fromEcrRepository(
            dockerImageAsset.repository,
            dockerImageAsset.imageTag
          ),
          containerPort: 1337,
          environment: {
            DATABASE_CLIENT: 'postgres',
            DATABASE_HOST: dbHostname,
            DATABASE_PORT: dbPort,
            DATABASE_NAME: dbName,
            HOST: '0.0.0.0',
            PORT: '1337',
            // S3 Plugin
            AWS_BUCKET: s3Bucket.bucketName,
            CDN_URL: domainName,
            CDN_ROOT_PATH: '',
          },
        },
        domainName: albDomainName,
        domainZone: hostedZone,
        certificate,
      }
    );
    strapiSecret.grantRead(loadBalancedService.taskDefinition.taskRole);
    s3Bucket.grantReadWrite(loadBalancedService.taskDefinition.taskRole);

    this.restricAccessToAdmin(loadBalancedService, authorizedIPsForAdminAccess);

    this.loadBalancer = loadBalancedService.loadBalancer;
  }

  private getSecretsDefinition(dbSecret: ISecret, strapiSecret: ISecret) {
    return {
      DATABASE_USERNAME: ecs_Secret.fromSecretsManager(dbSecret, 'username'),
      DATABASE_PASSWORD: ecs_Secret.fromSecretsManager(dbSecret, 'password'),
      JWT_SECRET: ecs_Secret.fromSecretsManager(strapiSecret, 'StrapiKey'),
      APP_KEYS: ecs_Secret.fromSecretsManager(strapiSecret, 'StrapiKey'),
      TRANSFER_TOKEN_SALT: ecs_Secret.fromSecretsManager(
        strapiSecret,
        'StrapiKey'
      ),
      API_TOKEN_SALT: ecs_Secret.fromSecretsManager(strapiSecret, 'StrapiKey'),
      ADMIN_JWT_SECRET: ecs_Secret.fromSecretsManager(
        strapiSecret,
        'StrapiKey'
      ),
    };
  }

  private restricAccessToAdmin(
    loadBalancedService: ApplicationLoadBalancedFargateService,
    authorizedIPsForAdminAccess: string[]
  ) {
    loadBalancedService.listener.addAction('accept', {
      priority: 1,
      conditions: [
        ListenerCondition.pathPatterns(['/admin/*']),
        ListenerCondition.sourceIps(authorizedIPsForAdminAccess),
      ],
      action: ListenerAction.forward([loadBalancedService.targetGroup]),
    });

    loadBalancedService.listener.addAction('forbidden', {
      priority: 2,
      conditions: [ListenerCondition.pathPatterns(['/admin/*'])],
      action: ListenerAction.fixedResponse(403, {
        contentType: 'text/html',
        messageBody: 'Your IP address is not authorized',
      }),
    });
  }
}

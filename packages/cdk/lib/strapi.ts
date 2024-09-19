import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Certificate } from './constructs/certificate';
import Database from './constructs/database';
import { ECSService } from './constructs/ecs-service';
import { Route53Record } from './constructs/route53-record';
import { StrapiVpc } from './constructs/vpc';
import { CDN } from './constructs/cdn';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { IApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

export interface StrapiStackProps extends StackProps {
  applicationName: string;
  domainName: string;
  hostedZoneDomainName: string;
  authorizedIPsForAdminAccess: string[];
  globalCertificate: ICertificate;
}

class StrapiStack extends Stack {
  public readonly loadBalancer: IApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: StrapiStackProps) {
    super(scope, id, props);

    const {
      applicationName,
      domainName,
      hostedZoneDomainName,
      authorizedIPsForAdminAccess,
      globalCertificate,
    } = props!;

    // Constructs

    const albDomainName = `alb.${domainName}`;

    const hostedZone = HostedZone.fromLookup(this, 'hosted-zone', {
      domainName: hostedZoneDomainName,
    });

    const vpc = new StrapiVpc(this, StrapiVpc.name);

    const database = new Database(this, Database.name, {
      applicationName,
      vpc: vpc.vpc,
    });

    const albCertificate = new Certificate(this, Certificate.name, {
      hostedZone,
      domainName: albDomainName,
    });

    const ecsServiceStack = new ECSService(this, ECSService.name, {
      certificate: albCertificate.certificate,
      dbHostname: database.dbCluster.clusterEndpoint.hostname.toString(),
      dbPort: database.dbCluster.clusterEndpoint.port.toString(),
      dbName: applicationName,
      dbSecret: database.dbSecret,
      vpc: vpc.vpc,
      applicationName,
      authorizedIPsForAdminAccess,
      domainName,
      albDomainName,
      hostedZone,
    });

    const cdn = new CDN(this, CDN.name, {
      loadBalancer: ecsServiceStack.loadBalancer,
      domainName,
      albDomainName,
      certificate: globalCertificate,
      s3Bucket: ecsServiceStack.s3Bucket,
    });

    new Route53Record(this, Route53Record.name, {
      hostedZoneDomainName,
      applicationName,
      distribution: cdn.distribution,
    });

    new CfnOutput(this, 'WebUrl', { value: cdn.distribution.domainName });
  }
}

export { StrapiStack };

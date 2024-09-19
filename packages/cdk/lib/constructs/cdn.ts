import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { IApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CDNProps {
  loadBalancer: IApplicationLoadBalancer;
  certificate: ICertificate;
  domainName: string;
  albDomainName: string;
  s3Bucket: Bucket;
}

export class CDN extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: CDNProps) {
    super(scope, id);

    const { certificate, domainName, albDomainName } = props;

    // CloudFront
    const lbOrigin = new HttpOrigin(albDomainName);
    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: lbOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.USE_ORIGIN_CACHE_CONTROL_HEADERS_QUERY_STRINGS,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      },
      defaultRootObject: 'index.html',
      domainNames: [domainName],
      certificate: certificate,
      httpVersion: HttpVersion.HTTP2,
      priceClass: PriceClass.PRICE_CLASS_100,
    });
    distribution.addBehavior('/admin/*', lbOrigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
    });
    distribution.addBehavior('/uploads/*', new S3Origin(props.s3Bucket), {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
    });

    this.distribution = distribution;
  }
}
